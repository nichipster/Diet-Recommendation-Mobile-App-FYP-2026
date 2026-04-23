from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select, or_

from ..dependencies import db_dependency, user_dependency
from ..models import user, food_item, custom_meal, FoodSource
from ..services.spoonacular_service import SpoonacularService

router = APIRouter(
    prefix="/food",
    tags=["Food"]
)


class FoodSearchResultResponse(BaseModel):
    food_id: Optional[int] = None
    custom_meal_id: Optional[int] = None
    external_id: Optional[int] = None
    name: str
    brand: Optional[str] = None
    barcode: Optional[str] = None
    source: FoodSource


class FoodDetailResponse(BaseModel):
    food_id: Optional[int] = None
    custom_meal_id: Optional[int] = None
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
    emoji: Optional[str] = None
    emoji_bg: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None


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


def build_food_detail_response(db_food: food_item) -> FoodDetailResponse:
    return FoodDetailResponse(
        external_id=db_food.external_id,
        source=db_food.source,
        name=db_food.name,
        brand=db_food.brand,
        barcode=db_food.barcode,
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


@router.get("/search", response_model=list[FoodSearchResultResponse], status_code=status.HTTP_200_OK)
async def search_foods(
    query: str,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    normalized_query = query.strip()
    if not normalized_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty"
        )

    results: list[FoodSearchResultResponse] = []
    seen_keys: set[tuple[str, str]] = set()

    # 1) global food_item
    db_foods = db.exec(
        select(food_item)
        .where(
            or_(
                food_item.name.ilike(f"%{normalized_query}%"),
                food_item.brand.ilike(f"%{normalized_query}%")
            )
        )
        .order_by(food_item.food_id.asc())
    ).all()

    for item in db_foods:
        # admin/manual foods do not have external_id
        unique_id = str(item.external_id) if item.external_id is not None else f"local-{item.food_id}"
        key = (item.source.value, unique_id)

        if key in seen_keys:
            continue

        results.append(
            FoodSearchResultResponse(
                food_id=item.food_id,
                custom_meal_id=None,
                external_id=item.external_id,
                name=item.name,
                brand=item.brand,
                barcode=item.barcode,
                source=item.source
            )
        )
        seen_keys.add(key)

    # 2) current user's custom meals only
    db_custom_meals = db.exec(
        select(custom_meal)
        .where(
            custom_meal.user_id == db_user.user_id,
            or_(
                custom_meal.name.ilike(f"%{normalized_query}%"),
                custom_meal.category.ilike(f"%{normalized_query}%")
            )
        )
        .order_by(custom_meal.created_at.desc())
    ).all()

    for item in db_custom_meals:
        key = (FoodSource.custom.value, str(item.custom_meal_id))

        if key in seen_keys:
            continue

        results.append(
            FoodSearchResultResponse(
                food_id=None,
                custom_meal_id=item.custom_meal_id,
                external_id=None,
                name=item.name,
                brand=None,
                barcode=None,
                source=FoodSource.custom
            )
        )
        seen_keys.add(key)

    if len(results) >= 10:
        return results[:10]

    # 3) Otherwise search Spoonacular and append unique results
    service = SpoonacularService()

    ingredient_data = service.search_ingredients(query=normalized_query, number=5)
    product_data = service.search_products(query=normalized_query, number=5)

    ingredients = ingredient_data.get("results", []) or []
    products = product_data.get("products", []) or []

    for ingredient in ingredients:
        ingredient_id = ingredient.get("id")
        if ingredient_id is None:
            continue

        key = (FoodSource.ingredient.value, str(ingredient_id))
        if key in seen_keys:
            continue

        results.append(
            FoodSearchResultResponse(
                food_id=None,
                external_id=ingredient_id,
                name=ingredient.get("name") or "Unknown ingredient",
                brand=None,
                barcode=None,
                source=FoodSource.ingredient
            )
        )
        seen_keys.add(key)

    for product in products:
        product_id = product.get("id")
        if product_id is None:
            continue

        key = (FoodSource.product.value, str(product_id))
        if key in seen_keys:
            continue

        results.append(
            FoodSearchResultResponse(
                food_id=None,
                external_id=product_id,
                name=product.get("title") or "Unknown product",
                brand=product.get("brand"),
                barcode=product.get("upc"),
                source=FoodSource.product
            )
        )
        seen_keys.add(key)

    return results[:10]


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
        return build_food_detail_response(existing_food)

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
    external_id: Optional[int] = None,
    food_id: Optional[int] = None,
    custom_meal_id: Optional[int] = None,
    source: FoodSource = None,
    db: db_dependency = None,
    current_user: user_dependency = None
):
    db_user = get_current_db_user(db, current_user)

    if source is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="source is required"
        )
    
    # Custom meal
    if source == FoodSource.custom:
        if custom_meal_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="custom_meal_id is required for custom meals"
            )

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

        return FoodDetailResponse(
            food_id=None,
            custom_meal_id=db_custom_meal.custom_meal_id,
            external_id=None,
            source=FoodSource.custom,
            name=db_custom_meal.name,
            brand=None,
            barcode=None,
            serving_size=db_custom_meal.serving_size,
            serving_unit=db_custom_meal.serving_unit,
            calories=db_custom_meal.calories,
            protein_g=db_custom_meal.protein_g,
            carb_g=db_custom_meal.carb_g,
            fat_g=db_custom_meal.fat_g,
            sugar_g=0,
            fiber_g=0,
            sodium_mg=0,
            emoji=db_custom_meal.emoji,
            emoji_bg=db_custom_meal.emoji_bg,
            category=db_custom_meal.category,
            notes=db_custom_meal.notes
        )

    # admin/manual foods may not have external_id
    if source in {FoodSource.admin, FoodSource.manual}:
        db_food = None

        if food_id is not None:
            db_food = db.exec(
                select(food_item).where(
                    food_item.food_id == food_id,
                    food_item.source == source
                )
            ).first()

        elif external_id is not None:
            db_food = db.exec(
                select(food_item).where(
                    food_item.external_id == external_id,
                    food_item.source == source
                )
            ).first()

        if db_food is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Food item not found"
            )

        return build_food_detail_response(db_food)

    if external_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="external_id is required for external food sources"
        )

    existing_food = db.exec(
        select(food_item).where(
            food_item.external_id == external_id,
            food_item.source == source
        )
    ).first()

    if existing_food is not None:
        return build_food_detail_response(existing_food)

    service = SpoonacularService()

    if source == FoodSource.ingredient:
        raw_data = service.get_ingredient_by_id(
            external_id,
            amount=100,
            unit="g"
        )
        mapped = service.map_ingredient_to_food_item_payload(raw_data)
    elif source == FoodSource.product:
        raw_data = service.get_product_by_id(external_id)
        mapped = service.map_product_to_food_item_payload(raw_data)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported food source"
        )

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
    elif request.source == FoodSource.product:
        raw_data = service.get_product_by_id(request.external_id)
        mapped = service.map_product_to_food_item_payload(raw_data)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ingredient and product sources can be saved via this endpoint"
        )

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