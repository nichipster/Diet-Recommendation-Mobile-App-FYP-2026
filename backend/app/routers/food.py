from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, food_item
from ..services.spoonacular_service import SpoonacularService

router = APIRouter(
    prefix="/food",
    tags=["Food"]
)


class FoodSearchResultResponse(BaseModel):
    external_id: int
    name: str
    brand: Optional[str] = None
    barcode: Optional[str] = None


class FoodDetailResponse(BaseModel):
    food_id: Optional[int] = None
    name: str
    brand: Optional[str] = None
    barcode: Optional[str] = None
    serving_size: float
    serving_unit: str
    calories: float
    protein_g: float
    carb_g: float
    fat_g: float
    sugar_g: float
    fiber_g: float
    sodium_mg: float


class SaveExternalFoodRequest(BaseModel):
    external_id: int = Field(gt=0)


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


@router.get("/search", response_model=list[FoodSearchResultResponse], status_code=status.HTTP_200_OK)
async def search_foods(
    query: str,
    db: db_dependency,
    current_user: user_dependency
):
    get_current_db_user(db, current_user)

    service = SpoonacularService()
    data = service.search_products(query=query, number=10)

    products = data.get("products", []) or []

    return [
        FoodSearchResultResponse(
            external_id=product.get("id"),
            name=product.get("title") or "Unknown product",
            brand=product.get("brand"),
            barcode=product.get("upc")
        )
        for product in products
        if product.get("id") is not None
    ]


@router.get("/barcode/{barcode}", response_model=FoodDetailResponse, status_code=status.HTTP_200_OK)
async def get_food_by_barcode(
    barcode: str,
    db: db_dependency,
    current_user: user_dependency
):
    get_current_db_user(db, current_user)

    existing_food = db.exec(
        select(food_item).where(food_item.barcode == barcode)
    ).first()

    if existing_food is not None:
        return FoodDetailResponse(
            food_id=existing_food.food_id,
            name=existing_food.name,
            brand=existing_food.brand,
            barcode=existing_food.barcode,
            serving_size=existing_food.serving_size,
            serving_unit=existing_food.serving_unit,
            calories=existing_food.calories,
            protein_g=existing_food.protein_g,
            carb_g=existing_food.carb_g,
            fat_g=existing_food.fat_g,
            sugar_g=existing_food.sugar_g,
            fiber_g=existing_food.fiber_g,
            sodium_mg=existing_food.sodium_mg
        )

    service = SpoonacularService()
    product = service.search_products_by_barcode(barcode=barcode)
    mapped = service.map_product_to_food_item_payload(product)

    return FoodDetailResponse(
        food_id=None,
        name=mapped["name"],
        brand=mapped["brand"],
        barcode=mapped["barcode"],
        serving_size=mapped["serving_size"],
        serving_unit=mapped["serving_unit"],
        calories=mapped["calories"],
        protein_g=mapped["protein_g"],
        carb_g=mapped["carb_g"],
        fat_g=mapped["fat_g"],
        sugar_g=mapped["sugar_g"],
        fiber_g=mapped["fiber_g"],
        sodium_mg=mapped["sodium_mg"]
    )


@router.post("/save-external", response_model=FoodDetailResponse, status_code=status.HTTP_201_CREATED)
async def save_external_food_to_db(
    request: SaveExternalFoodRequest,
    db: db_dependency,
    current_user: user_dependency
):
    get_current_db_user(db, current_user)

    service = SpoonacularService()
    product = service.get_product_by_id(request.external_id)
    mapped = service.map_product_to_food_item_payload(product)

    existing_food = None
    if mapped["barcode"]:
        existing_food = db.exec(
            select(food_item).where(food_item.barcode == mapped["barcode"])
        ).first()

    if existing_food is not None:
        return FoodDetailResponse(
            food_id=existing_food.food_id,
            name=existing_food.name,
            brand=existing_food.brand,
            barcode=existing_food.barcode,
            serving_size=existing_food.serving_size,
            serving_unit=existing_food.serving_unit,
            calories=existing_food.calories,
            protein_g=existing_food.protein_g,
            carb_g=existing_food.carb_g,
            fat_g=existing_food.fat_g,
            sugar_g=existing_food.sugar_g,
            fiber_g=existing_food.fiber_g,
            sodium_mg=existing_food.sodium_mg
        )

    new_food = food_item(
        name=mapped["name"],
        brand=mapped["brand"],
        barcode=mapped["barcode"],
        serving_size=mapped["serving_size"],
        serving_unit=mapped["serving_unit"],
        calories=mapped["calories"],
        protein_g=mapped["protein_g"],
        carb_g=mapped["carb_g"],
        fat_g=mapped["fat_g"],
        sugar_g=mapped["sugar_g"],
        fiber_g=mapped["fiber_g"],
        sodium_mg=mapped["sodium_mg"]
    )

    try:
        db.add(new_food)
        db.commit()
        db.refresh(new_food)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return FoodDetailResponse(
        food_id=new_food.food_id,
        name=new_food.name,
        brand=new_food.brand,
        barcode=new_food.barcode,
        serving_size=new_food.serving_size,
        serving_unit=new_food.serving_unit,
        calories=new_food.calories,
        protein_g=new_food.protein_g,
        carb_g=new_food.carb_g,
        fat_g=new_food.fat_g,
        sugar_g=new_food.sugar_g,
        fiber_g=new_food.fiber_g,
        sodium_mg=new_food.sodium_mg
    )