from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import (
    meal,
    meal_item,
    food_item,
    favourite_meal,
    favourite_meal_item,
    MealType
)
from .meal import (
    sg_now,
    get_current_db_user,
    create_meal_from_prepared_items,
    MealResponse
)


router = APIRouter(
    prefix="/favourite-meal",
    tags=["Favourite Meal"]
)


class FavouriteMealSaveRequest(BaseModel):
    name: Optional[str] = None


class LogFavouriteMealRequest(BaseModel):
    consumed_at: Optional[datetime] = None
    meal_type: Optional[MealType] = None


class FavouriteMealItemResponse(BaseModel):
    favourite_meal_item_id: int
    food_id: int
    food_name: str
    quantity: float
    unit: str


class FavouriteMealResponse(BaseModel):
    favourite_meal_id: int
    user_id: int
    name: str
    meal_type: MealType
    created_at: datetime
    updated_at: datetime
    items: list[FavouriteMealItemResponse]


class FavouriteMealListItemResponse(BaseModel):
    favourite_meal_id: int
    name: str
    meal_type: MealType
    item_count: int
    created_at: datetime
    updated_at: datetime


def build_favourite_meal_response(
    db: db_dependency,
    db_favourite_meal: favourite_meal
) -> FavouriteMealResponse:
    db_favourite_items = db.exec(
        select(favourite_meal_item).where(
            favourite_meal_item.favourite_meal_id == db_favourite_meal.favourite_meal_id
        )
    ).all()

    items_response = []

    for item in db_favourite_items:
        db_food = db.exec(
            select(food_item).where(food_item.food_id == item.food_id)
        ).first()

        food_name = db_food.name if db_food else "Unknown food"

        items_response.append(
            FavouriteMealItemResponse(
                favourite_meal_item_id=item.favourite_meal_item_id,
                food_id=item.food_id,
                food_name=food_name,
                quantity=item.quantity,
                unit=item.unit
            )
        )

    return FavouriteMealResponse(
        favourite_meal_id=db_favourite_meal.favourite_meal_id,
        user_id=db_favourite_meal.user_id,
        name=db_favourite_meal.name,
        meal_type=db_favourite_meal.meal_type,
        created_at=db_favourite_meal.created_at,
        updated_at=db_favourite_meal.updated_at,
        items=items_response
    )


def prepare_items_from_favourite_meal(
    db: db_dependency,
    db_favourite_meal: favourite_meal
) -> list[dict]:
    db_favourite_items = db.exec(
        select(favourite_meal_item).where(
            favourite_meal_item.favourite_meal_id == db_favourite_meal.favourite_meal_id
        )
    ).all()

    if not db_favourite_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Favourite meal must contain at least one food item"
        )

    prepared_items = []

    for item in db_favourite_items:
        db_food = db.exec(
            select(food_item).where(food_item.food_id == item.food_id)
        ).first()

        if db_food is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Food item with id {item.food_id} not found"
            )

        ratio = item.quantity / db_food.serving_size

        prepared_items.append(
            {
                "food_id": db_food.food_id,
                "amount": item.quantity,
                "unit": item.unit,
                "calories": db_food.calories * ratio,
                "protein_g": db_food.protein_g * ratio,
                "carb_g": db_food.carb_g * ratio,
                "fat_g": db_food.fat_g * ratio,
                "sugar_g": db_food.sugar_g * ratio,
                "sodium_mg": db_food.sodium_mg * ratio
            }
        )

    return prepared_items


def ensure_unique_favourite_meal_name(
    db: db_dependency,
    user_id: int,
    name: str
) -> None:
    existing_favourites = db.exec(
        select(favourite_meal).where(favourite_meal.user_id == user_id)
    ).all()

    normalized_name = name.strip().lower()

    for item in existing_favourites:
        if item.name.strip().lower() == normalized_name:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Favourite meal with the same name already exists"
            )


@router.post("/{meal_id}", response_model=FavouriteMealResponse, status_code=status.HTTP_201_CREATED)
async def save_meal_as_favourite(
    meal_id: int,
    request: FavouriteMealSaveRequest,
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

    db_meal_items = db.exec(
        select(meal_item).where(meal_item.meal_id == db_meal.meal_id)
    ).all()

    if not db_meal_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meal must contain at least one food item"
        )

    favourite_name = request.name.strip() if request.name else db_meal.meal_name
    ensure_unique_favourite_meal_name(db, db_user.user_id, favourite_name)

    new_favourite_meal = favourite_meal(
        user_id=db_user.user_id,
        name=favourite_name,
        meal_type=db_meal.meal_type
    )

    try:
        db.add(new_favourite_meal)
        db.commit()
        db.refresh(new_favourite_meal)

        for item in db_meal_items:
            new_favourite_item = favourite_meal_item(
                favourite_meal_id=new_favourite_meal.favourite_meal_id,
                food_id=item.food_id,
                quantity=item.amount,
                unit=item.unit
            )
            db.add(new_favourite_item)

        db.commit()
        db.refresh(new_favourite_meal)

        return build_favourite_meal_response(db, new_favourite_meal)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=list[FavouriteMealListItemResponse], status_code=status.HTTP_200_OK)
async def get_favourite_meals(
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    db_favourite_meals = db.exec(
        select(favourite_meal).where(
            favourite_meal.user_id == db_user.user_id
        ).order_by(favourite_meal.updated_at.desc())
    ).all()

    responses = []

    for item in db_favourite_meals:
        item_count = len(db.exec(
            select(favourite_meal_item).where(
                favourite_meal_item.favourite_meal_id == item.favourite_meal_id
            )
        ).all())

        responses.append(
            FavouriteMealListItemResponse(
                favourite_meal_id=item.favourite_meal_id,
                name=item.name,
                meal_type=item.meal_type,
                item_count=item_count,
                created_at=item.created_at,
                updated_at=item.updated_at
            )
        )

    return responses


@router.get("/{favourite_meal_id}", response_model=FavouriteMealResponse, status_code=status.HTTP_200_OK)
async def get_favourite_meal_detail(
    favourite_meal_id: int,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    db_favourite_meal = db.exec(
        select(favourite_meal).where(
            favourite_meal.favourite_meal_id == favourite_meal_id,
            favourite_meal.user_id == db_user.user_id
        )
    ).first()

    if db_favourite_meal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favourite meal not found"
        )

    return build_favourite_meal_response(db, db_favourite_meal)


@router.post("/{favourite_meal_id}/log", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
async def log_favourite_meal(
    favourite_meal_id: int,
    request: LogFavouriteMealRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    db_favourite_meal = db.exec(
        select(favourite_meal).where(
            favourite_meal.favourite_meal_id == favourite_meal_id,
            favourite_meal.user_id == db_user.user_id
        )
    ).first()

    if db_favourite_meal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favourite meal not found"
        )

    prepared_items = prepare_items_from_favourite_meal(db, db_favourite_meal)
    consumed_at = request.consumed_at or sg_now()
    meal_type = request.meal_type or db_favourite_meal.meal_type

    return create_meal_from_prepared_items(
        db=db,
        db_user=db_user,
        meal_type=meal_type,
        consumed_at=consumed_at,
        prepared_items=prepared_items
    )


@router.delete("/{favourite_meal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_favourite_meal(
    favourite_meal_id: int,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    db_favourite_meal = db.exec(
        select(favourite_meal).where(
            favourite_meal.favourite_meal_id == favourite_meal_id,
            favourite_meal.user_id == db_user.user_id
        )
    ).first()

    if db_favourite_meal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favourite meal not found"
        )

    db_favourite_items = db.exec(
        select(favourite_meal_item).where(
            favourite_meal_item.favourite_meal_id == db_favourite_meal.favourite_meal_id
        )
    ).all()

    try:
        for item in db_favourite_items:
            db.delete(item)

        db.delete(db_favourite_meal)
        db.commit()
        return

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )