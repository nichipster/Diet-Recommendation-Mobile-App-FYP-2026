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
    food_item,
    dietary_entry,
    custom_meal,
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

class CreateMealFromFoodRequest(BaseModel):
    food_id: int
    amount: float = Field(gt=0)
    meal_name: Optional[str] = None
    consumed_at: Optional[datetime] = None


class CreateManualMealRequest(BaseModel):
    meal_name: str
    consumed_at: Optional[datetime] = None
    amount: float = Field(gt=0)
    unit: str = "g"
    calories: float = Field(default=0, ge=0)
    protein_g: float = Field(default=0, ge=0)
    carb_g: float = Field(default=0, ge=0)
    fat_g: float = Field(default=0, ge=0)
    sugar_g: float = Field(default=0, ge=0)
    fiber_g: float = Field(default=0, ge=0)
    sodium_mg: float = Field(default=0, ge=0)


class MealResponse(BaseModel):
    meal_id: int
    user_id: int
    meal_name: str
    consumed_at: datetime
    source: FoodSource
    brand: Optional[str] = None
    barcode: Optional[str] = None
    amount: float
    unit: str
    rating: Optional[int] = None
    calories: float
    protein_g: float
    carb_g: float
    fat_g: float
    sugar_g: float
    fiber_g: float
    sodium_mg: float
    is_favorite: bool
    created_at: datetime
    updated_at: datetime


class MealListItemResponse(BaseModel):
    meal_id: int
    meal_name: str
    consumed_at: datetime
    calories: float
    protein_g: float
    carb_g: float
    fat_g: float
    amount: float
    unit: str
    is_favorite: bool


class UpdateMealFavoriteRequest(BaseModel):
    is_favorite: bool


class CreateMealFromCustomMealRequest(BaseModel):
    amount: float = Field(gt=0, default=1)
    consumed_at: Optional[datetime] = None
    meal_name: Optional[str] = None

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

    total_calories = sum(m.calories for m in meals_on_date)
    total_protein = sum(m.protein_g for m in meals_on_date)
    total_carb = sum(m.carb_g for m in meals_on_date)
    total_fat = sum(m.fat_g for m in meals_on_date)

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


def build_meal_response(db_meal: meal) -> MealResponse:
    return MealResponse(
        meal_id=db_meal.meal_id,
        user_id=db_meal.user_id,
        meal_name=db_meal.meal_name,
        consumed_at=db_meal.consumed_at,
        source=db_meal.source,
        brand=db_meal.brand,
        barcode=db_meal.barcode,
        amount=db_meal.amount,
        unit=db_meal.unit,
        rating=db_meal.rating,
        calories=db_meal.calories,
        protein_g=db_meal.protein_g,
        carb_g=db_meal.carb_g,
        fat_g=db_meal.fat_g,
        sugar_g=db_meal.sugar_g or 0,
        fiber_g=db_meal.fiber_g or 0,
        sodium_mg=db_meal.sodium_mg or 0,
        is_favorite=db_meal.is_favorite,
        created_at=db_meal.created_at,
        updated_at=db_meal.updated_at,
    )


# =========================
# Endpoints
# =========================

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
            consumed_at=m.consumed_at,
            calories=m.calories,
            protein_g=m.protein_g,
            carb_g=m.carb_g,
            fat_g=m.fat_g,
            amount=m.amount,
            unit=m.unit,
            is_favorite=m.is_favorite
        )
        for m in meals_on_date
    ]


@router.get("/dietary-entry")
async def get_dietary_entry(
    entry_date: date,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    entry = db.exec(
        select(dietary_entry).where(
            dietary_entry.user_id == db_user.user_id,
            dietary_entry.entry_date == entry_date
        )
    ).first()

    if entry is None:
        return {
            "entry_date": entry_date,
            "total_calories_consumed": 0,
            "total_protein_g": 0,
            "total_carb_g": 0,
            "total_fat_g": 0
        }

    return {
        "entry_date": entry.entry_date,
        "total_calories_consumed": entry.total_calories_consumed,
        "total_protein_g": entry.total_protein_g,
        "total_carb_g": entry.total_carb_g,
        "total_fat_g": entry.total_fat_g
    }


@router.get("/favorites", response_model=list[MealListItemResponse], status_code=status.HTTP_200_OK)
async def get_favorite_meals(
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    favorite_meals = db.exec(
        select(meal).where(
            meal.user_id == db_user.user_id,
            meal.is_favorite == True
        ).order_by(meal.updated_at.desc())
    ).all()

    return [
        MealListItemResponse(
            meal_id=m.meal_id,
            meal_name=m.meal_name,
            consumed_at=m.consumed_at,
            calories=m.calories,
            protein_g=m.protein_g,
            carb_g=m.carb_g,
            fat_g=m.fat_g,
            amount=m.amount,
            unit=m.unit,
            is_favorite=m.is_favorite
        )
        for m in favorite_meals
    ]


@router.post("/", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
async def create_meal_from_food(
    meal_data: CreateMealFromFoodRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    db_food = db.exec(
        select(food_item).where(food_item.food_id == meal_data.food_id)
    ).first()

    if db_food is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Food item with id {meal_data.food_id} not found"
        )

    consumed_at = meal_data.consumed_at or sg_now()
    ratio = meal_data.amount / db_food.serving_size

    new_meal = meal(
        user_id=db_user.user_id,
        meal_name=meal_data.meal_name.strip() if meal_data.meal_name else db_food.name,
        consumed_at=consumed_at,
        source=db_food.source,
        brand=db_food.brand,
        barcode=db_food.barcode,
        amount=meal_data.amount,
        unit=db_food.serving_unit,
        calories=db_food.calories * ratio,
        protein_g=db_food.protein_g * ratio,
        carb_g=db_food.carb_g * ratio,
        fat_g=db_food.fat_g * ratio,
        sugar_g=db_food.sugar_g * ratio,
        fiber_g=db_food.fiber_g * ratio,
        sodium_mg=db_food.sodium_mg * ratio,
    )

    try:
        db.add(new_meal)
        db.commit()
        db.refresh(new_meal)

        recalculate_dietary_entry(
            db=db,
            user_id=db_user.user_id,
            entry_date=consumed_at.date()
        )

        return build_meal_response(new_meal)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/manual", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_meal(
    meal_data: CreateManualMealRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)
    consumed_at = meal_data.consumed_at or sg_now()

    new_meal = meal(
        user_id=db_user.user_id,
        meal_name=meal_data.meal_name.strip(),
        consumed_at=consumed_at,
        source=FoodSource.manual,
        brand=None,
        barcode=None,
        amount=meal_data.amount,
        unit=meal_data.unit,
        calories=meal_data.calories,
        protein_g=meal_data.protein_g,
        carb_g=meal_data.carb_g,
        fat_g=meal_data.fat_g,
        sugar_g=meal_data.sugar_g,
        fiber_g=meal_data.fiber_g,
        sodium_mg=meal_data.sodium_mg,
    )

    try:
        db.add(new_meal)
        db.commit()
        db.refresh(new_meal)

        recalculate_dietary_entry(
            db=db,
            user_id=db_user.user_id,
            entry_date=consumed_at.date()
        )

        return build_meal_response(new_meal)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/custom/{custom_meal_id}",
    response_model=MealResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_meal_from_custom_meal(
    custom_meal_id: int,
    request: CreateMealFromCustomMealRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    db_custom_meal = db.exec(
        select(custom_meal).where(
            custom_meal.custom_meal_id == custom_meal_id,
            custom_meal.user_id == db_user.user_id
        )
    ).first()

    if db_custom_meal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom meal not found"
        )

    consumed_at = request.consumed_at or sg_now()
    ratio = request.amount / db_custom_meal.serving_size

    new_meal = meal(
        user_id=db_user.user_id,
        meal_name=request.meal_name.strip() if request.meal_name else db_custom_meal.name,
        consumed_at=consumed_at,
        source=FoodSource.custom,
        brand=None,
        barcode=None,
        amount=request.amount,
        unit=db_custom_meal.serving_unit,
        calories=db_custom_meal.calories * ratio,
        protein_g=db_custom_meal.protein_g * ratio,
        carb_g=db_custom_meal.carb_g * ratio,
        fat_g=db_custom_meal.fat_g * ratio,
        sugar_g=0,
        fiber_g=0,
        sodium_mg=0,
    )

    try:
        db.add(new_meal)
        db.commit()
        db.refresh(new_meal)

        recalculate_dietary_entry(
            db=db,
            user_id=db_user.user_id,
            entry_date=consumed_at.date()
        )

        return build_meal_response(new_meal)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch("/{meal_id}/favorite", response_model=MealResponse, status_code=status.HTTP_200_OK)
async def update_meal_favorite_status(
    meal_id: int,
    request: UpdateMealFavoriteRequest,
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

    try:
        db_meal.is_favorite = request.is_favorite
        db_meal.updated_at = sg_now()

        db.add(db_meal)
        db.commit()
        db.refresh(db_meal)

        return build_meal_response(db_meal)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


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

    return build_meal_response(db_meal)


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

    try:
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
