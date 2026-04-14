from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, food_item, FoodSource
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
    source: FoodSource


class FoodDetailResponse(BaseModel):
    external_id: Optional[int] = None
    source: FoodSource
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
    source: FoodSource


class SaveExternalFoodResponse(BaseModel):
    food_id: int
    external_id: Optional[int] = None
    source: FoodSource
    name: str


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

    ingredient_data = service.search_ingredients(query=query, number=5)
    product_data = service.search_products(query=query, number=5)

    ingredients = ingredient_data.get("results", []) or []
    products = product_data.get("products", []) or []

    results = []

    for ingredient in ingredients:
        if ingredient.get("id") is not None:
            results.append(
                FoodSearchResultResponse(
                    external_id=ingredient.get("id"),
                    name=ingredient.get("name") or "Unknown ingredient",
                    brand=None,
                    barcode=None,
                    source=FoodSource.ingredient
                )
            )

    for product in products:
        if product.get("id") is not None:
            results.append(
                FoodSearchResultResponse(
                    external_id=product.get("id"),
                    name=product.get("title") or "Unknown product",
                    brand=product.get("brand"),
                    barcode=product.get("upc"),
                    source=FoodSource.product
                )
            )

    return results


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
            external_id=existing_food.external_id,
            source=existing_food.source,
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
        external_id=product.get("id"),
        source=FoodSource.product,
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


@router.get("/detail", response_model=FoodDetailResponse, status_code=status.HTTP_200_OK)
async def get_food_detail(
    external_id: int,
    source: FoodSource,
    db: db_dependency,
    current_user: user_dependency
):
    get_current_db_user(db, current_user)

    existing_food = db.exec(
        select(food_item).where(
            food_item.external_id == external_id,
            food_item.source == source
        )
    ).first()

    if existing_food is not None:
        return FoodDetailResponse(
            external_id=existing_food.external_id,
            source=existing_food.source,
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

    if source == FoodSource.ingredient:
        raw_data = service.get_ingredient_by_id(
            external_id,
            amount=100,
            unit="g"
        )
        mapped = service.map_ingredient_to_food_item_payload(raw_data)
    else:
        raw_data = service.get_product_by_id(external_id)
        mapped = service.map_product_to_food_item_payload(raw_data)

    return FoodDetailResponse(
        external_id=external_id,
        source=source,
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


@router.post("/save-external", response_model=SaveExternalFoodResponse, status_code=status.HTTP_201_CREATED)
async def save_external_food_to_db(
    request: SaveExternalFoodRequest,
    db: db_dependency,
    current_user: user_dependency
):
    get_current_db_user(db, current_user)

    service = SpoonacularService()

    if request.source == FoodSource.ingredient:
        raw_data = service.get_ingredient_by_id(
            request.external_id,
            amount=100,
            unit="g"
        )
        mapped = service.map_ingredient_to_food_item_payload(raw_data)
    else:
        raw_data = service.get_product_by_id(request.external_id)
        mapped = service.map_product_to_food_item_payload(raw_data)

    existing_food = db.exec(
        select(food_item).where(
            food_item.source == request.source,
            food_item.external_id == request.external_id
        )
    ).first()

    if existing_food is not None:
        return SaveExternalFoodResponse(
            food_id=existing_food.food_id,
            external_id=existing_food.external_id,
            source=existing_food.source,
            name=existing_food.name
        )

    new_food = food_item(
        external_id=request.external_id,
        source=request.source,
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

    return SaveExternalFoodResponse(
        food_id=new_food.food_id,
        external_id=new_food.external_id,
        source=new_food.source,
        name=new_food.name
    )