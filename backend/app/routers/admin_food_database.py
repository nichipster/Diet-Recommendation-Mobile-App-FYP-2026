from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import food_item, FoodSource


router = APIRouter(
    prefix="/admin/food-database",
    tags=["Admin Food Database"]
)


def require_admin(current_user: user_dependency) -> dict:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user


def get_food_or_404(db: db_dependency, food_id: int) -> food_item:
    db_food = db.exec(
        select(food_item).where(food_item.food_id == food_id)
    ).first()

    if db_food is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food item not found"
        )

    return db_food


class AdminFoodItemRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    brand: str | None = None
    barcode: str | None = None
    source: FoodSource = FoodSource.admin
    serving_size: float = Field(gt=0)
    serving_unit: str = Field(min_length=1, max_length=50)
    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carb_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    sugar_g: float = Field(default=0, ge=0)
    fiber_g: float = Field(default=0, ge=0)
    sodium_mg: float = Field(default=0, ge=0)


class AdminFoodItemResponse(BaseModel):
    food_id: int
    external_id: int | None = None
    name: str
    brand: str | None = None
    barcode: str | None = None
    source: FoodSource
    serving_size: float
    serving_unit: str
    calories: float
    protein_g: float
    carb_g: float
    fat_g: float
    sugar_g: float
    fiber_g: float
    sodium_mg: float


def build_food_response(db_food: food_item) -> AdminFoodItemResponse:
    return AdminFoodItemResponse(
        food_id=db_food.food_id,
        external_id=db_food.external_id,
        name=db_food.name,
        brand=db_food.brand,
        barcode=db_food.barcode,
        source=db_food.source,
        serving_size=db_food.serving_size,
        serving_unit=db_food.serving_unit,
        calories=db_food.calories,
        protein_g=db_food.protein_g,
        carb_g=db_food.carb_g,
        fat_g=db_food.fat_g,
        sugar_g=db_food.sugar_g,
        fiber_g=db_food.fiber_g,
        sodium_mg=db_food.sodium_mg
    )


@router.get(
    "/",
    response_model=list[AdminFoodItemResponse],
    status_code=status.HTTP_200_OK
)
async def get_admin_food_database(
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    foods = db.exec(
        select(food_item)
        .order_by(food_item.food_id.asc())
    ).all()

    return [build_food_response(food) for food in foods]


@router.post(
    "/",
    response_model=AdminFoodItemResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_admin_food_item(
    request: AdminFoodItemRequest,
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    if request.source != FoodSource.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source must be 'admin'"
        )

    normalized_name = request.name.strip()
    normalized_brand = request.brand.strip() if request.brand else None
    normalized_barcode = request.barcode.strip() if request.barcode else None
    normalized_serving_unit = request.serving_unit.strip()

    if normalized_barcode:
        existing_barcode = db.exec(
            select(food_item).where(food_item.barcode == normalized_barcode)
        ).first()

        if existing_barcode is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Barcode already exists"
            )

    new_food = food_item(
        external_id=None,
        name=normalized_name,
        brand=normalized_brand,
        barcode=normalized_barcode,
        source=FoodSource.admin,
        serving_size=request.serving_size,
        serving_unit=normalized_serving_unit,
        calories=request.calories,
        protein_g=request.protein_g,
        carb_g=request.carb_g,
        fat_g=request.fat_g,
        sugar_g=request.sugar_g,
        fiber_g=request.fiber_g,
        sodium_mg=request.sodium_mg
    )

    try:
        db.add(new_food)
        db.commit()
        db.refresh(new_food)
        return build_food_response(new_food)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put(
    "/{food_id}",
    response_model=AdminFoodItemResponse,
    status_code=status.HTTP_200_OK
)
async def update_admin_food_item(
    food_id: int,
    request: AdminFoodItemRequest,
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    db_food = get_food_or_404(db, food_id)

    if db_food.source != FoodSource.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only admin-added food items can be edited here"
        )

    if request.source != FoodSource.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source must be 'admin'"
        )

    normalized_name = request.name.strip()
    normalized_brand = request.brand.strip() if request.brand else None
    normalized_barcode = request.barcode.strip() if request.barcode else None
    normalized_serving_unit = request.serving_unit.strip()

    if normalized_barcode:
        existing_barcode = db.exec(
            select(food_item).where(
                food_item.barcode == normalized_barcode,
                food_item.food_id != food_id
            )
        ).first()

        if existing_barcode is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Barcode already exists"
            )

    db_food.name = normalized_name
    db_food.brand = normalized_brand
    db_food.barcode = normalized_barcode
    db_food.source = FoodSource.admin
    db_food.serving_size = request.serving_size
    db_food.serving_unit = normalized_serving_unit
    db_food.calories = request.calories
    db_food.protein_g = request.protein_g
    db_food.carb_g = request.carb_g
    db_food.fat_g = request.fat_g
    db_food.sugar_g = request.sugar_g
    db_food.fiber_g = request.fiber_g
    db_food.sodium_mg = request.sodium_mg

    try:
        db.add(db_food)
        db.commit()
        db.refresh(db_food)
        return build_food_response(db_food)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/{food_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_admin_food_item(
    food_id: int,
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    db_food = get_food_or_404(db, food_id)

    if db_food.source != FoodSource.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only admin-added food items can be deleted here"
        )

    try:
        db.delete(db_food)
        db.commit()
        return

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )