from typing import Optional
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, UploadFile, File, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, meal, dietary_entry, FoodSource
from ..services.image_recognition_service import analyze_image

router = APIRouter(
    prefix="/image-recognition",
    tags=["Image Recognition"],
)

_ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
_MAX_FILE_BYTES = 5 * 1024 * 1024
SG_TZ = ZoneInfo("Asia/Singapore")


class IngredientItem(BaseModel):
    name: str
    amount_g: float
    calories: float
    protein_g: float
    carb_g: float
    fat_g: float
    sugar_g: float
    fiber_g: float
    sodium_mg: float


class NutritionTotal(BaseModel):
    calories: float
    protein_g: float
    carb_g: float
    fat_g: float


class AlternativePrediction(BaseModel):
    name: str
    confidence: float


class ImageRecognitionResult(BaseModel):
    detected_dish: str
    confidence: float
    needs_confirmation: bool
    top_alternatives: list[AlternativePrediction]
    ingredients: list[IngredientItem]
    nutrition_total: Optional[NutritionTotal]
    quality_warning: Optional[str]


class ConfirmIngredient(BaseModel):
    name: str
    amount_g: float = Field(gt=0)
    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carb_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)


class ConfirmMealRequest(BaseModel):
    meal_name: str
    ingredients: list[ConfirmIngredient]
    portion_multiplier: float = Field(default=1.0, gt=0, le=5.0)
    consumed_at: Optional[datetime] = None


class MealLogResponse(BaseModel):
    meal_id: int
    meal_name: str
    calories: float
    protein_g: float
    carb_g: float
    fat_g: float
    consumed_at: datetime


def _require_user(db: db_dependency, current_user: user_dependency) -> user:
    """
    Resolves the current authenticated user from the database.

    Args:
        db (db_dependency): Active database session.
        current_user (user_dependency): JWT payload from auth middleware.

    Returns:
        user: The authenticated user ORM instance.

    Raises:
        HTTPException: 401 if token invalid, 404 if user not found.
    """
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    db_user = db.exec(select(user).where(user.user_id == int(current_user["id"]))).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return db_user


@router.post(
    "/analyze",
    response_model=ImageRecognitionResult,
    status_code=status.HTTP_200_OK,
    summary="Analyse a food photo and return dish prediction with ingredients and nutrition",
)
async def analyze_food_image(
    image: UploadFile = File(...),
    db: db_dependency = None,
    current_user: user_dependency = None
):
    """
    Accepts a multipart image upload and runs the full ML inference pipeline.
    Returns classification result, ingredient list, and nutrition estimate.
    If confidence is below 0.55, returns needs_confirmation=True with an empty
    ingredient list for the user to manually identify the dish.
    """
    _require_user(db, current_user)

    if image.content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {image.content_type}. Use JPEG, PNG, or WEBP.",
        )

    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    if len(image_bytes) > _MAX_FILE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File exceeds 5MB limit.")

    try:
        result = analyze_image(image_bytes=image_bytes, db=db)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"ML model not ready: {exc}",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return ImageRecognitionResult(
        detected_dish=result["detected_dish"],
        confidence=result["confidence"],
        needs_confirmation=result["needs_confirmation"],
        top_alternatives=[AlternativePrediction(**a) for a in result["top_alternatives"]],
        ingredients=[IngredientItem(**i) for i in result["ingredients"]],
        nutrition_total=NutritionTotal(**result["nutrition_total"]) if result["nutrition_total"] else None,
        quality_warning=result.get("quality_warning"),
    )

@router.post(
    "/log",
    response_model=MealLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Commit a confirmed recognition result to the meal diary",
)
async def log_confirmed_meal(
    request: ConfirmMealRequest,
    db: db_dependency = None,
    current_user: user_dependency = None,
):
    """
    Saves the user-confirmed image recognition result as a meal diary entry.
    Aggregates ingredient nutrition totals, applies the portion multiplier,
    and writes to the meal table. Also updates the dietary_entry aggregate.
    """
    db_user = _require_user(db, current_user)
    consumed_at = request.consumed_at or datetime.now(SG_TZ)
    multiplier = request.portion_multiplier

    total_calories  = round(sum(i.calories  * multiplier for i in request.ingredients), 2)
    total_protein_g = round(sum(i.protein_g * multiplier for i in request.ingredients), 2)
    total_carb_g    = round(sum(i.carb_g    * multiplier for i in request.ingredients), 2)
    total_fat_g     = round(sum(i.fat_g     * multiplier for i in request.ingredients), 2)
    total_amount_g  = round(sum(i.amount_g  * multiplier for i in request.ingredients), 2)

    new_meal = meal(
        user_id=db_user.user_id,
        meal_name=request.meal_name.strip(),
        consumed_at=consumed_at,
        source=FoodSource.manual,
        amount=total_amount_g,
        unit="g",
        calories=total_calories,
        protein_g=total_protein_g,
        carb_g=total_carb_g,
        fat_g=total_fat_g,
        sugar_g=0.0,
        fiber_g=0.0,
        sodium_mg=0.0,
    )

    try:
        db.add(new_meal)
        db.commit()
        db.refresh(new_meal)
        _update_dietary_entry(db, db_user.user_id, consumed_at.date())
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return MealLogResponse(
        meal_id=new_meal.meal_id,
        meal_name=new_meal.meal_name,
        calories=new_meal.calories,
        protein_g=new_meal.protein_g,
        carb_g=new_meal.carb_g,
        fat_g=new_meal.fat_g,
        consumed_at=new_meal.consumed_at,
    )


def _update_dietary_entry(db: db_dependency, user_id: int, entry_date) -> None:
    """
    Recalculates and upserts the dietary_entry aggregate for a given date
    after a new meal is added via image recognition.

    Args:
        db (db_dependency): Active database session.
        user_id (int): The user whose entry to update.
        entry_date: The date of consumption.
    """

    start = datetime.combine(entry_date, time.min).replace(tzinfo=SG_TZ)
    end   = start + timedelta(days=1)

    meals_today = db.exec(
        select(meal).where(
            meal.user_id == user_id,
            meal.consumed_at >= start,
            meal.consumed_at < end,
        )
    ).all()

    totals = {
        "calories":  sum(m.calories  for m in meals_today),
        "protein_g": sum(m.protein_g for m in meals_today),
        "carb_g":    sum(m.carb_g    for m in meals_today),
        "fat_g":     sum(m.fat_g     for m in meals_today),
    }

    existing = db.exec(
        select(dietary_entry).where(
            dietary_entry.user_id == user_id,
            dietary_entry.entry_date == entry_date,
        )
    ).first()

    if existing:
        existing.total_calories_consumed = totals["calories"]
        existing.total_protein_g = totals["protein_g"]
        existing.total_carb_g    = totals["carb_g"]
        existing.total_fat_g     = totals["fat_g"]
        existing.updated_at      = datetime.now(SG_TZ)
        db.add(existing)
    else:
        db.add(dietary_entry(
            user_id=user_id,
            entry_date=entry_date,
            total_calories_consumed=totals["calories"],
            total_protein_g=totals["protein_g"],
            total_carb_g=totals["carb_g"],
            total_fat_g=totals["fat_g"],
        ))

    db.commit()