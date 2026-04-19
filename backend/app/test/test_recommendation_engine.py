import pytest
from app.ml.recommendation_engine.filters import apply_hard_filters
from app.ml.recommendation_engine.schemas import RecipeCandidate, UserPreferenceContext


def make_recipe(**kwargs) -> RecipeCandidate:
    defaults = dict(
        recipe_id=1, spoonacular_id=100, title="Test", meal_type="lunch",
        cuisine_type=None, calories=400, protein_g=30, carb_g=40, fat_g=10,
        is_vegetarian=False, is_vegan=False, is_halal=False, is_gluten_free=False
    )
    defaults.update(kwargs)
    return RecipeCandidate(**defaults)


class TestApplyHardFilters:

    def test_vegetarian_user_excludes_non_vegetarian(self):
        prefs = UserPreferenceContext(is_vegetarian=True)
        candidates = [
            make_recipe(recipe_id=1, is_vegetarian=True),
            make_recipe(recipe_id=2, is_vegetarian=False),
        ]
        result = apply_hard_filters(candidates, prefs)
        assert len(result) == 1
        assert result[0].recipe_id == 1

    def test_no_prefs_returns_all(self):
        prefs = UserPreferenceContext()
        candidates = [make_recipe(recipe_id=i) for i in range(5)]
        result = apply_hard_filters(candidates, prefs)
        assert len(result) == 5

    def test_vegan_subset_of_vegetarian(self):
        prefs = UserPreferenceContext(is_vegan=True)
        candidates = [
            make_recipe(recipe_id=1, is_vegetarian=True, is_vegan=True),
            make_recipe(recipe_id=2, is_vegetarian=True, is_vegan=False),
        ]
        result = apply_hard_filters(candidates, prefs)
        assert len(result) == 1
        assert result[0].recipe_id == 1