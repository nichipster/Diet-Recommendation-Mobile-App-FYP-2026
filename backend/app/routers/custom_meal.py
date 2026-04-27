from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, custom_meal


router = APIRouter(
    prefix="/custom-meals",
    tags=["Custom Meals"]
)


def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))


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


def get_custom_meal_or_404(
    db: db_dependency,
    custom_meal_id: int,
    user_id: int
) -> custom_meal:
    db_custom_meal = db.exec(
        select(custom_meal).where(
            custom_meal.custom_meal_id == custom_meal_id,
            custom_meal.user_id == user_id
        )
    ).first()

    if db_custom_meal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom meal not found"
        )

    return db_custom_meal


class CreateCustomMealRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    emoji: str = Field(min_length=1, max_length=10)
    emoji_bg: str = Field(min_length=1, max_length=50)
    category: str = Field(min_length=1, max_length=100)
    serving_size: float = Field(ge=0)
    serving_unit: str = Field(min_length=1, max_length=50)
    calories: float = Field(ge=0)
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fats: float = Field(ge=0)
    notes: Optional[str] = None


class CustomMealResponse(BaseModel):
    custom_meal_id: int
    name: str
    emoji: str
    emoji_bg: str
    category: str
    serving_size: float
    serving_unit: str
    calories: float
    protein: float
    carbs: float
    fats: float
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


def build_custom_meal_response(db_custom_meal: custom_meal) -> CustomMealResponse:
    return CustomMealResponse(
        custom_meal_id=db_custom_meal.custom_meal_id,
        name=db_custom_meal.name,
        emoji=db_custom_meal.emoji,
        emoji_bg=db_custom_meal.emoji_bg,
        category=db_custom_meal.category,
        serving_size=db_custom_meal.serving_size,
        serving_unit=db_custom_meal.serving_unit,
        calories=db_custom_meal.calories,
        protein=db_custom_meal.protein_g,
        carbs=db_custom_meal.carb_g,
        fats=db_custom_meal.fat_g,
        notes=db_custom_meal.notes,
        created_at=db_custom_meal.created_at,
        updated_at=db_custom_meal.updated_at
    )


@router.post(
    "/",
    response_model=CustomMealResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_custom_meal(
    request: CreateCustomMealRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    new_custom_meal = custom_meal(
        user_id=db_user.user_id,
        name=request.name.strip(),
        emoji=request.emoji.strip(),
        emoji_bg=request.emoji_bg.strip(),
        category=request.category.strip(),
        serving_size=request.serving_size,
        serving_unit=request.serving_unit.strip(),
        calories=request.calories,
        protein_g=request.protein,
        carb_g=request.carbs,
        fat_g=request.fats,
        notes=request.notes.strip() if request.notes else None
    )

    try:
        db.add(new_custom_meal)
        db.commit()
        db.refresh(new_custom_meal)
        return build_custom_meal_response(new_custom_meal)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/",
    response_model=list[CustomMealResponse],
    status_code=status.HTTP_200_OK
)
async def get_my_custom_meals(
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    custom_meals = db.exec(
        select(custom_meal)
        .where(custom_meal.user_id == db_user.user_id)
        .order_by(custom_meal.created_at.desc())
    ).all()

    return [build_custom_meal_response(item) for item in custom_meals]


@router.get(
    "/{custom_meal_id}",
    response_model=CustomMealResponse,
    status_code=status.HTTP_200_OK
)
async def get_custom_meal_detail(
    custom_meal_id: int,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)
    db_custom_meal = get_custom_meal_or_404(db, custom_meal_id, db_user.user_id)
    return build_custom_meal_response(db_custom_meal)


@router.delete(
    "/{custom_meal_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_custom_meal(
    custom_meal_id: int,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)
    db_custom_meal = get_custom_meal_or_404(db, custom_meal_id, db_user.user_id)

    try:
        db.delete(db_custom_meal)
        db.commit()
        return

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )