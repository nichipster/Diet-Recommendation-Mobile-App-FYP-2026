from sqlmodel import Session, select

from ...models import food_item
from .schemas import RecipeCandidate, UserPreferenceContext
from ...models import MealType, recipe


# Reason: These tag sets map food_item tags (strings) to the preference flags
# that must be satisfied. If a user flag is True, the item MUST carry the
# corresponding tag, OR it must not carry a disqualifying allergy tag.
# This is a placeholder — food_item currently has no tag column.
# See Step 6 for the schema extension recommendation.

_DIET_REQUIRED_TAGS: dict[str, str] = {
    "is_vegetarian": "vegetarian",
    "is_vegan": "vegan",
    "is_halal": "halal",
    "is_gluten_free": "gluten_free",
}

_ALLERGY_DISQUALIFYING_TAGS: dict[str, str] = {
    "has_peanut_allergy": "peanut",
    "has_tree_nut_allergy": "tree_nut",
    "has_milk_allergy": "milk",
    "has_egg_allergy": "egg",
    "has_fish_allergy": "fish",
    "has_shellfish_allergy": "shellfish",
    "has_soy_allergy": "soy",
    "has_wheat_allergy": "wheat",
    "has_sesame_allergy": "sesame",
    "has_sulfite_allergy": "sulfite",
}


def fetch_recipe_candidates(
        db: Session,
        meal_type: MealType
        ) -> list[RecipeCandidate]:
    """
    Retrieves all recipe rows matching the requested meal_type.
    Only Spoonacular-sourced recipes (is_custom=False) and user-created
    public recipes (is_public=True) are included in the recommendation pool.

    Args:
        db (Session): SQLModel database session.
        meal_type (MealType): The meal category requested by the user.

    Returns:
        list[RecipeCandidate]: All eligible recipes for this meal slot.
    """
    recipes = db.exec(
        select(recipe).where(
            recipe.meal_type == meal_type,
            (recipe.is_custom == False) | (recipe.is_public == True)
        )
    ).all()
    return [
        RecipeCandidate(
            recipe_id=r.recipe_id,
            spoonacular_id=r.spoonacular_id,
            title=r.title,
            meal_type=r.meal_type,
            cuisine_type=r.cuisine_type,
            calories=r.total_calories,
            protein_g=r.total_protein_g,
            carb_g=r.total_carb_g,
            fat_g=r.total_fat_g,
            is_vegetarian=r.is_vegetarian,
            is_vegan=r.is_vegan,
            is_halal=r.is_halal,
            is_gluten_free=r.is_gluten_free,
        )
        for r in recipes
        if r.recipe_id is not None
    ]


def apply_hard_filters(
    candidates: list[RecipeCandidate],
    prefs: UserPreferenceContext
) -> list[RecipeCandidate]:
    """
    Removes recipe candidates that violate user dietary preferences or allergies.

    Unlike the food_item approach (which used a tags list that was never populated),
    recipes have first-class boolean dietary flags from Spoonacular ingestion.
    This makes filtering deterministic and reliable.
    """
    filtered = []
    for candidate in candidates:
        if prefs.is_vegetarian and not candidate.is_vegetarian:
            continue
        if prefs.is_vegan and not candidate.is_vegan:
            continue
        if prefs.is_halal and not candidate.is_halal:
            continue
        if prefs.is_gluten_free and not candidate.is_gluten_free:
            continue
        # Note: allergen-level filtering (peanut, shellfish, etc.) requires
        # ingredient-level data per recipe. This is an enhancement that can
        # be added once /recipes/{id}/ingredientWidget data is ingested.
        filtered.append(candidate)
    return filtered


def apply_calorie_budget_filter(
    candidates: list[RecipeCandidate],
    remaining_calories: float,
    tolerance: float = 0.20
) -> list[RecipeCandidate]:
    """
    Soft-filters recipes far exceeding the remaining calorie budget.
    Unchanged from previous version — logic is entity-agnostic.
    """
    if remaining_calories <= 0:
        return candidates

    upper_limit = remaining_calories * (1 + tolerance)
    return [c for c in candidates if c.calories <= upper_limit]