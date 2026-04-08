from datetime import datetime, date, time, timedelta
from zoneinfo import ZoneInfo
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import (
    user,
    meal,
    meal_item,
    food_item,
    dietary_entry,
    MealType,
    FoodSource
)

router = APIRouter(
    prefix="/meal",
    tags=["Meal"]
)

def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))

# =========================
# Request / Response models
# =========================

class CreateMealItemRequest(BaseModel):
    food_id: int
    amount: float = Field(gt=0)


class ManualMealItemRequest(BaseModel):
    name: str
    brand: Optional[str] = None
    amount: float = Field(gt=0)
    unit: str
    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carb_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    sugar_g: float = Field(default=0, ge=0)
    fiber_g: float = Field(default=0, ge=0)
    sodium_mg: float = Field(default=0, ge=0)


class BaseMealRequest(BaseModel):
    meal_type: MealType
    consumed_at: Optional[datetime] = None


class CreateMealRequest(BaseMealRequest):
    items: list[CreateMealItemRequest]


class CreateManualMealRequest(BaseMealRequest):
    items: list[ManualMealItemRequest]


class MealItemResponse(BaseModel):
    meal_item_id: int
    food_id: int
    food_name: str
    amount: float
    unit: str
    calories: float
    protein_g: float
    carb_g: float
    fat_g: float


class MealResponse(BaseModel):
    meal_id: int
    user_id: int
    meal_name: str
    meal_type: MealType
    consumed_at: datetime
    total_calories: float
    total_protein_g: float
    total_carb_g: float
    total_fat_g: float
    total_sugar_g: float
    total_sodium_mg: float
    created_at: datetime
    updated_at: datetime
    items: list[MealItemResponse]


class MealListItemResponse(BaseModel):
    meal_id: int
    meal_name: str
    meal_type: MealType
    consumed_at: datetime
    total_calories: float


# =========================
# Helper functions
# =========================

def get_current_db_user(
    db: db_dependency,
    current_user: user_dependency
) -> user:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    db_user = db.exec(
        select(user).where(user.user_id == int(current_user["id"]))
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return db_user


def recalculate_dietary_entry(
    db: db_dependency,
    user_id: int,
    entry_date: date
) -> None:
    start_of_day = datetime.combine(entry_date, time.min).replace(
        tzinfo=ZoneInfo("Asia/Singapore")
    )
    start_of_next_day = start_of_day + timedelta(days=1)

    meals_on_date = db.exec(
        select(meal).where(
            meal.user_id == user_id,
            meal.consumed_at >= start_of_day,
            meal.consumed_at < start_of_next_day
        )
    ).all()

    total_calories = sum(m.total_calories for m in meals_on_date)
    total_protein = sum(m.total_protein_g for m in meals_on_date)
    total_carb = sum(m.total_carb_g for m in meals_on_date)
    total_fat = sum(m.total_fat_g for m in meals_on_date)

    existing_entry = db.exec(
        select(dietary_entry).where(
            dietary_entry.user_id == user_id,
            dietary_entry.entry_date == entry_date
        )
    ).first()

    if existing_entry is None:
        new_entry = dietary_entry(
            user_id=user_id,
            entry_date=entry_date,
            total_calories_consumed=total_calories,
            total_protein_g=total_protein,
            total_carb_g=total_carb,
            total_fat_g=total_fat
        )
        db.add(new_entry)
    else:
        existing_entry.total_calories_consumed = total_calories
        existing_entry.total_protein_g = total_protein
        existing_entry.total_carb_g = total_carb
        existing_entry.total_fat_g = total_fat
        existing_entry.updated_at = sg_now()
        db.add(existing_entry)

    db.commit()


def build_meal_response(
    db: db_dependency,
    db_meal: meal
) -> MealResponse:
    db_meal_items = db.exec(
        select(meal_item).where(meal_item.meal_id == db_meal.meal_id)
    ).all()

    items_response = []

    for item in db_meal_items:
        db_food = db.exec(
            select(food_item).where(food_item.food_id == item.food_id)
        ).first()

        food_name = db_food.name if db_food else "Unknown food"

        items_response.append(
            MealItemResponse(
                meal_item_id=item.meal_item_id,
                food_id=item.food_id,
                food_name=food_name,
                amount=item.amount,
                unit=item.unit,
                calories=item.calories,
                protein_g=item.protein_g,
                carb_g=item.carb_g,
                fat_g=item.fat_g
            )
        )

    return MealResponse(
        meal_id=db_meal.meal_id,
        user_id=db_meal.user_id,
        meal_name=db_meal.meal_name,
        meal_type=db_meal.meal_type,
        consumed_at=db_meal.consumed_at,
        total_calories=db_meal.total_calories,
        total_protein_g=db_meal.total_protein_g,
        total_carb_g=db_meal.total_carb_g,
        total_fat_g=db_meal.total_fat_g,
        total_sugar_g=db_meal.total_sugar_g,
        total_sodium_mg=db_meal.total_sodium_mg,
        created_at=db_meal.created_at,
        updated_at=db_meal.updated_at,
        items=items_response
    )


def prepare_items_from_food_ids(
    db: db_dependency,
    items: list[CreateMealItemRequest]
) -> list[dict]:
    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meal must contain at least one food item"
        )

    prepared_items = []

    for item in items:
        db_food = db.exec(
            select(food_item).where(food_item.food_id == item.food_id)
        ).first()

        if db_food is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Food item with id {item.food_id} not found"
            )
        
        selected_unit = db_food.serving_unit
        ratio = item.amount / db_food.serving_size

        prepared_items.append(
            {
                "food_id": db_food.food_id,
                "amount": item.amount,
                "unit": selected_unit,
                "calories": db_food.calories * ratio,
                "protein_g": db_food.protein_g * ratio,
                "carb_g": db_food.carb_g * ratio,
                "fat_g": db_food.fat_g * ratio,
                "sugar_g": db_food.sugar_g * ratio,
                "sodium_mg": db_food.sodium_mg * ratio
            }
        )

    return prepared_items


def prepare_items_from_manual_inputs(
    db: db_dependency,
    items: list[ManualMealItemRequest]
) -> list[dict]:
    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meal must contain at least one food item"
        )

    prepared_items = []

    for item in items:
        new_food = food_item(
            name=item.name,
            source=FoodSource.manual,
            brand=item.brand,
            serving_size=item.amount,
            serving_unit=item.unit,
            calories=item.calories,
            protein_g=item.protein_g,
            carb_g=item.carb_g,
            fat_g=item.fat_g,
            sugar_g=item.sugar_g,
            fiber_g=item.fiber_g,
            sodium_mg=item.sodium_mg
        )
        db.add(new_food)
        db.commit()
        db.refresh(new_food)

        prepared_items.append(
            {
                "food_id": new_food.food_id,
                "amount": item.amount,
                "unit": item.unit,
                "calories": item.calories,
                "protein_g": item.protein_g,
                "carb_g": item.carb_g,
                "fat_g": item.fat_g,
                "sugar_g": item.sugar_g,
                "sodium_mg": item.sodium_mg
            }
        )

    return prepared_items

def generate_meal_name(meal_type: MealType, consumed_at: datetime) -> str:
    return f"{meal_type}_{consumed_at.strftime('%Y%m%d')}"

def get_existing_meal_for_datetime(
    db: db_dependency,
    user_id: int,
    meal_type: MealType,
    consumed_at: datetime
) -> Optional[meal]:
    start_of_day = datetime.combine(consumed_at.date(), time.min).replace(
        tzinfo=ZoneInfo("Asia/Singapore")
    )
    start_of_next_day = start_of_day + timedelta(days=1)

    return db.exec(
        select(meal).where(
            meal.user_id == user_id,
            meal.meal_type == meal_type,
            meal.consumed_at >= start_of_day,
            meal.consumed_at < start_of_next_day
        )
    ).first()

def create_meal_from_prepared_items(
    db: db_dependency,
    db_user: user,
    meal_type: MealType,
    consumed_at: datetime,
    prepared_items: list[dict]
) -> MealResponse:
    total_calories = sum(item["calories"] for item in prepared_items)
    total_protein = sum(item["protein_g"] for item in prepared_items)
    total_carb = sum(item["carb_g"] for item in prepared_items)
    total_fat = sum(item["fat_g"] for item in prepared_items)
    total_sugar = sum(item["sugar_g"] for item in prepared_items)
    total_sodium = sum(item["sodium_mg"] for item in prepared_items)

    existing_meal = get_existing_meal_for_datetime(
        db=db,
        user_id=db_user.user_id,
        meal_type=meal_type,
        consumed_at=consumed_at
    )

    try:
        if existing_meal is None:
            target_meal = meal(
                user_id=db_user.user_id,
                meal_name=generate_meal_name(meal_type, consumed_at),
                meal_type=meal_type,
                consumed_at=consumed_at,
                total_calories=0,
                total_protein_g=0,
                total_carb_g=0,
                total_fat_g=0,
                total_sugar_g=0,
                total_sodium_mg=0
            )
            db.add(target_meal)
            db.commit()
            db.refresh(target_meal)
        else:
            target_meal = existing_meal

        for item in prepared_items:
            new_meal_item = meal_item(
                meal_id=target_meal.meal_id,
                food_id=item["food_id"],
                amount=item["amount"],
                unit=item["unit"],
                calories=item["calories"],
                protein_g=item["protein_g"],
                carb_g=item["carb_g"],
                fat_g=item["fat_g"]
            )
            db.add(new_meal_item)

        target_meal.total_calories += total_calories
        target_meal.total_protein_g += total_protein
        target_meal.total_carb_g += total_carb
        target_meal.total_fat_g += total_fat
        target_meal.total_sugar_g += total_sugar
        target_meal.total_sodium_mg += total_sodium
        target_meal.updated_at = sg_now()

        db.add(target_meal)
        db.commit()
        db.refresh(target_meal)

        recalculate_dietary_entry(
            db=db,
            user_id=db_user.user_id,
            entry_date=consumed_at.date()
        )

        return build_meal_response(db, target_meal)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# =========================
# Endpoints
# =========================

@router.post("/", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
async def create_meal(
    meal_data: CreateMealRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)
    consumed_at = meal_data.consumed_at or sg_now()

    prepared_items = prepare_items_from_food_ids(db, meal_data.items)

    return create_meal_from_prepared_items(
        db=db,
        db_user=db_user,
        meal_type=meal_data.meal_type,
        consumed_at=consumed_at,
        prepared_items=prepared_items
    )


@router.post("/manual", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_meal(
    meal_data: CreateManualMealRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)
    consumed_at = meal_data.consumed_at or sg_now()

    prepared_items = prepare_items_from_manual_inputs(db, meal_data.items)

    return create_meal_from_prepared_items(
        db=db,
        db_user=db_user,
        meal_type=meal_data.meal_type,
        consumed_at=consumed_at,
        prepared_items=prepared_items
    )


@router.get("/", response_model=list[MealListItemResponse], status_code=status.HTTP_200_OK)
async def get_meals_by_date(
    entry_date: date,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    start_of_day = datetime.combine(entry_date, time.min).replace(
        tzinfo=ZoneInfo("Asia/Singapore")
    )
    start_of_next_day = start_of_day + timedelta(days=1)

    meals_on_date = db.exec(
        select(meal).where(
            meal.user_id == db_user.user_id,
            meal.consumed_at >= start_of_day,
            meal.consumed_at < start_of_next_day
        ).order_by(meal.consumed_at.asc())
    ).all()

    return [
        MealListItemResponse(
            meal_id=m.meal_id,
            meal_name=m.meal_name,
            meal_type=m.meal_type,
            consumed_at=m.consumed_at,
            total_calories=m.total_calories
        )
        for m in meals_on_date
    ]


@router.get("/{meal_id}", response_model=MealResponse, status_code=status.HTTP_200_OK)
async def get_meal_detail(
    meal_id: int,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    db_meal = db.exec(
        select(meal).where(
            meal.meal_id == meal_id,
            meal.user_id == db_user.user_id
        )
    ).first()

    if db_meal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found"
        )

    return build_meal_response(db, db_meal)

@router.delete("/item/{meal_item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal_item(
    meal_item_id: int,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    db_meal_item = db.exec(
        select(meal_item).where(meal_item.meal_item_id == meal_item_id)
    ).first()

    if db_meal_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal item not found"
        )

    parent_meal = db.exec(
        select(meal).where(
            meal.meal_id == db_meal_item.meal_id,
            meal.user_id == db_user.user_id
        )
    ).first()

    if parent_meal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found"
        )

    meal_date = parent_meal.consumed_at.date()

    try:
        parent_meal.total_calories -= db_meal_item.calories
        parent_meal.total_protein_g -= db_meal_item.protein_g
        parent_meal.total_carb_g -= db_meal_item.carb_g
        parent_meal.total_fat_g -= db_meal_item.fat_g
        parent_meal.updated_at = sg_now()

        db.delete(db_meal_item)

        remaining_items = db.exec(
            select(meal_item).where(meal_item.meal_id == parent_meal.meal_id)
        ).all()

        if len(remaining_items) == 0:
            db.delete(parent_meal)
        else:
            db.add(parent_meal)

        db.commit()

        recalculate_dietary_entry(
            db=db,
            user_id=db_user.user_id,
            entry_date=meal_date
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal(
    meal_id: int,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    db_meal = db.exec(
        select(meal).where(
            meal.meal_id == meal_id,
            meal.user_id == db_user.user_id
        )
    ).first()

    if db_meal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found"
        )

    meal_date = db_meal.consumed_at.date()

    db_meal_items = db.exec(
        select(meal_item).where(meal_item.meal_id == db_meal.meal_id)
    ).all()

    try:
        for item in db_meal_items:
            db.delete(item)

        db.delete(db_meal)
        db.commit()

        recalculate_dietary_entry(
            db=db,
            user_id=db_user.user_id,
            entry_date=meal_date
        )

        return

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )