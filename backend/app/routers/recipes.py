from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from sqlmodel import Session, select
from typing import Any

from ..dependencies import db_dependency, user_dependency
from ..models import recipe, MealType, user as UserModel
from ..services.spoonacular_service import SpoonacularService, _infer_meal_type

router = APIRouter(
    prefix="/recipes", 
    tags=["Recipes"]
    )


class RecipeDetailResponse(BaseModel):
    """Full recipe detail fetched live from Spoonacular on user selection."""
    spoonacular_id: int
    title: str
    image: str
    source_url: str
    ready_in_minutes: int
    servings: int
    summary: str
    instructions: str
    ingredients: list[dict[str, Any]]


class IngestRequest(BaseModel):
    meal_types: list[str] = Field(
        default=["breakfast", "lunch", "dinner"],
        description="Spoonacular meal type labels to ingest."
    )
    per_type: int = Field(default=50, ge=1, le=100)


class IngestResponse(BaseModel):
    inserted: int
    skipped_duplicates: int
    skipped_no_macros: int


def _require_admin(current_user: user_dependency) -> dict:
    """Raises 403 if the caller is not an admin user."""
    if current_user is None or current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.post(
    "/ingest",
    response_model=IngestResponse,
    status_code=status.HTTP_200_OK,
    summary="Background: ingest Spoonacular recipes into local catalogue",
    description=(
        "Admin-only endpoint. Calls Spoonacular /recipes/complexSearch "
        "for each requested meal type and bulk-inserts the results into the "
        "local recipe table. Duplicate spoonacular_id values are skipped."
    )
)
def ingest_recipes(
    request: IngestRequest,
    db: db_dependency,
    current_user: user_dependency,
) -> IngestResponse:
    """
    Background ingestion of Spoonacular recipes into the local catalogue.
    This is the only place where Spoonacular is called for recipe data.
    The recommendation engine will only read from the local recipe table.

    Args:
        request (IngestRequest): Which meal types and how many per type.
        db (db_dependency): Database session.
        current_user (user_dependency): Must be admin role.

    Returns:
        IngestResponse: Counts of inserted, skipped, and invalid recipes.
    """
    _require_admin(current_user)

    service = SpoonacularService()
    inserted = 0
    skipped_dupes = 0
    skipped_no_macros = 0

    for meal_type_str in request.meal_types:
        result = service.search_recipes_complex(
            meal_type=meal_type_str,
            number=request.per_type
        )
        recipes_raw = result.get("results", []) or []

        for raw in recipes_raw:
            spoon_id = raw.get("id")
            if spoon_id is None:
                skipped_no_macros += 1
                continue

            # Idempotency check: skip if already ingested
            existing = db.exec(
                select(recipe).where(recipe.spoonacular_id == spoon_id)
            ).first()
            if existing is not None:
                skipped_dupes += 1
                continue

            payload = service.map_complex_search_recipe_to_local(raw)

            # Skip recipes with no usable calorie data
            if payload["total_calories"] == 0:
                skipped_no_macros += 1
                continue

            # Validate meal_type maps to our enum
            try:
                mt = MealType(payload["meal_type"])
            except ValueError:
                mt = MealType.dinner  # Safe default

            new_recipe = recipe(
                spoonacular_id=payload["spoonacular_id"],
                title=payload["title"],
                meal_type=mt,
                cuisine_type=payload["cuisine_type"],
                total_calories=payload["total_calories"],
                total_protein_g=payload["total_protein_g"],
                total_carb_g=payload["total_carb_g"],
                total_fat_g=payload["total_fat_g"],
                servings=payload["servings"],
                cook_time_min=payload["cook_time_min"],
                is_vegetarian=payload["is_vegetarian"],
                is_vegan=payload["is_vegan"],
                is_halal=payload["is_halal"],
                is_gluten_free=payload["is_gluten_free"],
                is_custom=False,
                is_public=False,
                description=None,
                instructions=None,
                user_id=None,
            )
            db.add(new_recipe)
            inserted += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database commit failed during ingestion: {str(e)}"
        )

    return IngestResponse(
        inserted=inserted,
        skipped_duplicates=skipped_dupes,
        skipped_no_macros=skipped_no_macros
    )


@router.get(
    "/{spoonacular_id}/detail",
    response_model=RecipeDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Fetch full recipe detail on user selection (live Spoonacular call)",
    description=(
        "Called only when a user taps a recommended recipe. "
        "Makes a live Spoonacular API call using the stored spoonacular_id "
        "and returns full recipe details. Response is NOT stored permanently."
    )
)
def get_recipe_detail(
    spoonacular_id: int,
    db: db_dependency,
    current_user: user_dependency,
) -> RecipeDetailResponse:
    """
    Fetches full recipe detail from Spoonacular for the selected recipe.

    The spoonacular_id comes from the recommendation result list.
    This endpoint is intentionally not cached permanently — each call
    reflects the latest available data from Spoonacular.

    Args:
        spoonacular_id (int): The Spoonacular recipe ID from the recommendation result.
        db (db_dependency): Database session (used to validate recipe exists locally).
        current_user (user_dependency): JWT-validated user.

    Returns:
        RecipeDetailResponse: Full recipe payload (instructions, image, ingredients).

    Raises:
        HTTPException 404: If the spoonacular_id doesn't match any local recipe.
        HTTPException 502: If Spoonacular is unreachable or returns an error.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    # Validate that this spoonacular_id is in our local catalogue.
    # Reason: Prevents users from arbitrarily probing the Spoonacular API
    # via our backend using random IDs — only IDs we ingested are allowed.
    local = db.exec(
        select(recipe).where(recipe.spoonacular_id == spoonacular_id)
    ).first()
    if local is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recipe with spoonacular_id={spoonacular_id} not found in local catalogue."
        )

    service = SpoonacularService()
    raw = service.get_recipe_information(spoonacular_id)

    # Parse ingredients list into a clean structure
    ingredients = []
    for ing in raw.get("extendedIngredients", []) or []:
        ingredients.append({
            "name": ing.get("name", ""),
            "amount": ing.get("amount", 0),
            "unit": ing.get("unit", ""),
            "original": ing.get("original", ""),
        })

    # Extract plain-text instructions from Spoonacular's analyzed steps
    instructions_text = ""
    analyzed = raw.get("analyzedInstructions") or []
    if analyzed:
        steps = analyzed[0].get("steps", []) or []
        instructions_text = "\n".join(
            f"{s.get('number', i+1)}. {s.get('step', '')}"
            for i, s in enumerate(steps)
        )
    else:
        instructions_text = raw.get("instructions") or "No instructions available."

    return RecipeDetailResponse(
        spoonacular_id=spoonacular_id,
        title=raw.get("title", local.title),
        image=raw.get("image", ""),
        source_url=raw.get("sourceUrl", ""),
        ready_in_minutes=raw.get("readyInMinutes", local.cook_time_min),
        servings=raw.get("servings", local.servings),
        summary=raw.get("summary", ""),
        instructions=instructions_text,
        ingredients=ingredients,
    )