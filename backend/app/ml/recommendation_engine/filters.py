from sqlmodel import Session, select

from app.models import food_item
from .schemas import FoodCandidate, UserPreferenceContext


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


def fetch_all_candidates(db: Session) -> list[FoodCandidate]:
    """
    Retrieves all food items from the database as FoodCandidate objects.

    Args:
        db (Session): SQLModel database session.

    Returns:
        list[FoodCandidate]: All food items in the database.
    """
    items = db.exec(select(food_item)).all()
    return [
        FoodCandidate(
            food_id=item.food_id,
            name=item.name,
            calories=item.calories,
            protein_g=item.protein_g,
            carb_g=item.carb_g,
            fat_g=item.fat_g,
            sugar_g=item.sugar_g,
            sodium_mg=item.sodium_mg,
            tags=[]   # Tags will be populated once food_item has a tags column
        )
        for item in items
        if item.food_id is not None
    ]


def apply_hard_filters(
    candidates: list[FoodCandidate],
    prefs: UserPreferenceContext
) -> list[FoodCandidate]:
    """
    Removes candidates that violate the user's dietary preferences or allergies.

    Two distinct filter types are applied:
    1. Dietary requirement filters (e.g., vegan): The item MUST carry the
       required tag if the user's preference flag is True.
    2. Allergy exclusion filters: The item MUST NOT carry a disqualifying tag.

    Note: Until food_item has a tags column, dietary requirement filters
    cannot be evaluated. Only allergy exclusion is enforced today.
    Allergy exclusions default to pass-through (no items have allergy tags yet).

    Args:
        candidates (list[FoodCandidate]): All food items pre-fetch.
        prefs (UserPreferenceContext): The user's preferences and allergies.

    Returns:
        list[FoodCandidate]: The filtered subset of candidates.
    """
    filtered = []

    for candidate in candidates:
        tag_set = set(candidate.tags)
        exclude = False

        # Check dietary requirements: if user flag is set, item must have tag
        for pref_field, required_tag in _DIET_REQUIRED_TAGS.items():
            if getattr(prefs, pref_field) and required_tag not in tag_set:
                # Reason: We only exclude if the item *lacks* the required tag
                # AND the tag pool is non-empty. If tags are empty (not yet
                # populated), we pass through to avoid filtering everything.
                if tag_set:
                    exclude = True
                    break

        if exclude:
            continue

        # Check allergies: if user has an allergy, item must NOT carry that tag
        for allergy_field, disqualifying_tag in _ALLERGY_DISQUALIFYING_TAGS.items():
            if getattr(prefs, allergy_field) and disqualifying_tag in tag_set:
                exclude = True
                break

        if not exclude:
            filtered.append(candidate)

    return filtered


def apply_calorie_budget_filter(
    candidates: list[FoodCandidate],
    remaining_calories: float,
    tolerance: float = 0.20
) -> list[FoodCandidate]:
    """
    Soft-filters out items far exceeding the remaining calorie budget.

    Items whose calories exceed `remaining_calories * (1 + tolerance)` are
    removed. A 20% tolerance is applied to avoid over-strict filtering when
    the budget is nearly exhausted.

    If remaining_calories is <= 0 (budget exceeded), no calorie filter is
    applied — let the scorer penalise instead.

    Args:
        candidates (list[FoodCandidate]): Candidates to filter.
        remaining_calories (float): User's remaining calorie budget today.
        tolerance (float): Fractional overshoot allowed. Default 0.20 (20%).

    Returns:
        list[FoodCandidate]: Calorie-filtered candidates.
    """
    if remaining_calories <= 0:
        # Reason: Budget is already exceeded; returning an empty list here
        # would give the user nothing. Let the scorer rank by lowest cal instead.
        return candidates

    upper_limit = remaining_calories * (1 + tolerance)
    return [c for c in candidates if c.calories <= upper_limit]