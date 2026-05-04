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

    def test_gluten_free_filter(self):
        """Gluten-free preference should exclude non-GF recipes."""
        prefs = UserPreferenceContext(is_gluten_free=True)
        candidates = [
            make_recipe(recipe_id=1, is_gluten_free=True),
            make_recipe(recipe_id=2, is_gluten_free=False),
        ]
        result = apply_hard_filters(candidates, prefs)
        assert len(result) == 1
        assert result[0].recipe_id == 1

    def test_halal_filter_stub_returns_false(self):
        """
        Known bug: _infer_halal() always returns False, so all recipes have
        is_halal=False. A halal user will receive zero results from the
        catalogue. This test documents that failing state.
        """
        prefs = UserPreferenceContext(is_halal=True)
        candidates = [
            make_recipe(recipe_id=1, is_halal=False),
            make_recipe(recipe_id=2, is_halal=False),
        ]
        result = apply_hard_filters(candidates, prefs)
        # BUG: all Spoonacular-sourced recipes have is_halal=False
        assert len(result) == 0, (
            "Halal filtering returns empty results because _infer_halal() is a stub. "
            "Fix _infer_halal() in spoonacular_service.py to resolve."
        )

    def test_halal_filter_passes_explicitly_halal_recipe(self):
        """A recipe with is_halal=True should pass the halal filter."""
        prefs = UserPreferenceContext(is_halal=True)
        candidates = [
            make_recipe(recipe_id=1, is_halal=True),
            make_recipe(recipe_id=2, is_halal=False),
        ]
        result = apply_hard_filters(candidates, prefs)
        assert len(result) == 1
        assert result[0].recipe_id == 1

    def test_combined_vegan_and_gluten_free(self):
        """Multiple active preferences must ALL be satisfied."""
        prefs = UserPreferenceContext(is_vegan=True, is_gluten_free=True)
        candidates = [
            make_recipe(recipe_id=1, is_vegetarian=True, is_vegan=True, is_gluten_free=True),
            make_recipe(recipe_id=2, is_vegetarian=True, is_vegan=True, is_gluten_free=False),
            make_recipe(recipe_id=3, is_vegetarian=True, is_vegan=False, is_gluten_free=True),
        ]
        result = apply_hard_filters(candidates, prefs)
        assert len(result) == 1
        assert result[0].recipe_id == 1


# ===========================================================================
# apply_calorie_budget_filter
# ===========================================================================

class TestApplyCalorieBudgetFilter:
    """Unit tests for filters.apply_calorie_budget_filter()."""

    def test_recipe_within_budget_passes(self):
        from app.ml.recommendation_engine.filters import apply_calorie_budget_filter
        candidates = [make_recipe(recipe_id=1, calories=400.0)]
        result = apply_calorie_budget_filter(candidates, remaining_calories=500.0)
        assert len(result) == 1

    def test_recipe_at_exactly_120_percent_passes(self):
        """Budget tolerance is 20%, so 120% of remaining is the upper bound."""
        from app.ml.recommendation_engine.filters import apply_calorie_budget_filter
        # 500 * 1.20 = 600; recipe at exactly 600 should pass
        candidates = [make_recipe(recipe_id=1, calories=600.0)]
        result = apply_calorie_budget_filter(candidates, remaining_calories=500.0)
        assert len(result) == 1

    def test_recipe_above_120_percent_excluded(self):
        """Recipes above the tolerance ceiling must be excluded."""
        from app.ml.recommendation_engine.filters import apply_calorie_budget_filter
        candidates = [make_recipe(recipe_id=1, calories=601.0)]
        result = apply_calorie_budget_filter(candidates, remaining_calories=500.0)
        assert len(result) == 0

    def test_zero_remaining_calories_returns_all_candidates(self):
        """If remaining_calories <= 0, all candidates are returned (no filtering)."""
        from app.ml.recommendation_engine.filters import apply_calorie_budget_filter
        candidates = [make_recipe(recipe_id=i, calories=float(i * 100)) for i in range(1, 6)]
        result = apply_calorie_budget_filter(candidates, remaining_calories=0)
        assert len(result) == 5

    def test_negative_remaining_calories_returns_all_candidates(self):
        """Negative remaining_calories (budget exceeded) should return all candidates."""
        from app.ml.recommendation_engine.filters import apply_calorie_budget_filter
        candidates = [make_recipe(recipe_id=1, calories=800.0)]
        result = apply_calorie_budget_filter(candidates, remaining_calories=-100.0)
        assert len(result) == 1


# ===========================================================================
# fetch_recipe_candidates (requires DB fixture)
# ===========================================================================

class TestFetchRecipeCandidates:
    """Integration-style unit tests for filters.fetch_recipe_candidates()."""

    def _seed_recipe(self, db_session, meal_type="lunch", is_custom=False, is_public=False, **kwargs):
        from app.models import recipe, MealType
        defaults = dict(
            title="Test Recipe",
            spoonacular_id=None,
            meal_type=meal_type,
            servings=2,
            cook_time_min=20,
            total_calories=400.0,
            total_protein_g=25.0,
            total_carb_g=40.0,
            total_fat_g=10.0,
            is_vegetarian=False,
            is_vegan=False,
            is_halal=False,
            is_gluten_free=False,
            is_custom=is_custom,
            is_public=is_public,
        )
        defaults.update(kwargs)
        r = recipe(**defaults)
        db_session.add(r)
        db_session.commit()
        db_session.refresh(r)
        return r

    def test_returns_only_matching_meal_type(self, db_session):
        """Only recipes matching the requested meal_type should be returned."""
        from app.ml.recommendation_engine.filters import fetch_recipe_candidates
        from app.models import MealType

        self._seed_recipe(db_session, meal_type="lunch", is_custom=False, title="Lunch A")
        self._seed_recipe(db_session, meal_type="dinner", is_custom=False, title="Dinner B")

        results = fetch_recipe_candidates(db_session, MealType.lunch)
        titles = [r.title for r in results]
        assert "Lunch A" in titles
        assert "Dinner B" not in titles

    def test_excludes_non_public_custom_recipes(self, db_session):
        """Custom recipes that are not public should be excluded from the pool."""
        from app.ml.recommendation_engine.filters import fetch_recipe_candidates
        from app.models import MealType

        self._seed_recipe(db_session, meal_type="dinner", is_custom=True, is_public=False, title="Private Custom")
        self._seed_recipe(db_session, meal_type="dinner", is_custom=False, is_public=False, title="Public Spoon")

        results = fetch_recipe_candidates(db_session, MealType.dinner)
        titles = [r.title for r in results]
        assert "Public Spoon" in titles
        assert "Private Custom" not in titles

    def test_includes_public_custom_recipes(self, db_session):
        """Custom recipes marked is_public=True should be included."""
        from app.ml.recommendation_engine.filters import fetch_recipe_candidates
        from app.models import MealType

        self._seed_recipe(db_session, meal_type="breakfast", is_custom=True, is_public=True, title="Shared Oats")

        results = fetch_recipe_candidates(db_session, MealType.breakfast)
        titles = [r.title for r in results]
        assert "Shared Oats" in titles

    def test_empty_catalogue_returns_empty_list(self, db_session):
        """Empty recipe table should return an empty candidate list."""
        from app.ml.recommendation_engine.filters import fetch_recipe_candidates
        from app.models import MealType

        results = fetch_recipe_candidates(db_session, MealType.lunch)
        assert isinstance(results, list)


# ===========================================================================
# compute_content_scores
# ===========================================================================

class TestComputeContentScores:
    """Unit tests for content_scorer.compute_content_scores()."""

    def _goal_ctx(self, **kwargs):
        from app.ml.recommendation_engine.schemas import UserGoalContext
        defaults = dict(
            user_id=1,
            remaining_calories=500.0,
            remaining_protein_g=30.0,
            remaining_carb_g=60.0,
            remaining_fat_g=15.0,
            goal_type="maintain",
        )
        defaults.update(kwargs)
        return UserGoalContext(**defaults)

    def test_returns_scored_recipes_list(self):
        from app.ml.recommendation_engine.content_scorer import compute_content_scores
        ctx = self._goal_ctx()
        candidates = [make_recipe(recipe_id=1, calories=400, protein_g=25, carb_g=50, fat_g=12)]
        result = compute_content_scores(candidates, ctx)
        assert len(result) == 1
        assert hasattr(result[0], "content_score")

    def test_empty_candidates_returns_empty(self):
        from app.ml.recommendation_engine.content_scorer import compute_content_scores
        ctx = self._goal_ctx()
        result = compute_content_scores([], ctx)
        assert result == []

    def test_content_score_capped_at_one(self):
        from app.ml.recommendation_engine.content_scorer import compute_content_scores
        ctx = self._goal_ctx()
        candidates = [make_recipe(recipe_id=1, calories=500, protein_g=30, carb_g=60, fat_g=15)]
        result = compute_content_scores(candidates, ctx)
        assert result[0].content_score <= 1.0

    def test_scores_are_in_valid_range(self):
        from app.ml.recommendation_engine.content_scorer import compute_content_scores
        ctx = self._goal_ctx()
        candidates = [
            make_recipe(recipe_id=i, calories=float(i * 100), protein_g=10, carb_g=30, fat_g=5)
            for i in range(1, 6)
        ]
        result = compute_content_scores(candidates, ctx)
        for r in result:
            assert 0.0 <= r.content_score <= 1.0

    def test_lose_goal_modifier_penalises_high_calorie(self):
        """With 'lose' goal, a 700-calorie recipe should score lower than a 200-calorie one."""
        from app.ml.recommendation_engine.content_scorer import compute_content_scores
        ctx = self._goal_ctx(goal_type="lose", remaining_calories=400)
        low_cal = make_recipe(recipe_id=1, calories=200, protein_g=20, carb_g=25, fat_g=5)
        high_cal = make_recipe(recipe_id=2, calories=750, protein_g=10, carb_g=80, fat_g=30)
        result = compute_content_scores([low_cal, high_cal], ctx)
        scores = {r.recipe_id: r.content_score for r in result}
        assert scores[1] > scores[2]


# ===========================================================================
# compute_collab_scores
# ===========================================================================

class TestComputeCollabScores:
    """Unit tests for collab_scorer.compute_collab_scores()."""

    def _scored_recipe(self, recipe_id: int, calories: float = 400.0):
        from app.ml.recommendation_engine.schemas import ScoredRecipe
        return ScoredRecipe(
            recipe_id=recipe_id,
            spoonacular_id=None,
            title=f"Recipe {recipe_id}",
            meal_type="lunch",
            calories=calories,
            protein_g=20,
            carb_g=40,
            fat_g=10,
        )

    def test_cold_start_sets_collab_score_to_zero(self, db_session):
        """User with no recommendation logs should get collab_score=0.0 for all."""
        from app.ml.recommendation_engine.collab_scorer import compute_collab_scores
        candidates = [self._scored_recipe(1), self._scored_recipe(2)]
        result = compute_collab_scores(db_session, target_user_id=9999, candidates=candidates)
        for c in result:
            assert c.collab_score == 0.0

    def test_collab_score_in_valid_range(self, db_session):
        """With actual logs, collab scores should remain in [0, 1]."""
        from app.ml.recommendation_engine.collab_scorer import compute_collab_scores
        from app.models import user, recipe, recommendation_log, MealType, UserRole
        from app.test.utils import create_test_user

        # Seed two users and a recipe
        u1 = create_test_user(db_session, email="collab_u1@test.com")
        u2 = create_test_user(db_session, email="collab_u2@test.com")

        r = recipe(
            title="Collab Test Recipe",
            meal_type=MealType.lunch,
            servings=2, cook_time_min=15,
            total_calories=400, total_protein_g=20,
            total_carb_g=40, total_fat_g=10,
            is_custom=False, is_public=False,
        )
        db_session.add(r)
        db_session.commit()
        db_session.refresh(r)

        # u2 rated the recipe
        log = recommendation_log(
            user_id=u2.user_id,
            recipe_id=r.recipe_id,
            meal_type=MealType.lunch,
            was_accepted=True,
            rating=5,
        )
        db_session.add(log)
        db_session.commit()

        scored_r = self._scored_recipe(r.recipe_id)
        result = compute_collab_scores(db_session, target_user_id=u1.user_id, candidates=[scored_r])
        assert 0.0 <= result[0].collab_score <= 1.0


# ===========================================================================
# Engine: _compute_alpha, _merge_scores, get_recommendations
# ===========================================================================

class TestComputeAlpha:
    """Unit tests for engine._compute_alpha()."""

    def test_zero_ratings_returns_1_0(self):
        from app.ml.recommendation_engine.engine import _compute_alpha
        assert _compute_alpha(0) == 1.0

    def test_few_ratings_returns_0_7(self):
        from app.ml.recommendation_engine.engine import _compute_alpha
        for count in [1, 5, 9]:
            assert _compute_alpha(count) == 0.7

    def test_ten_or_more_ratings_returns_0_5(self):
        from app.ml.recommendation_engine.engine import _compute_alpha
        for count in [10, 20, 100]:
            assert _compute_alpha(count) == 0.5


class TestMergeScores:
    """Unit tests for engine._merge_scores()."""

    def _scored_recipe(self, recipe_id: int, content: float, collab: float):
        from app.ml.recommendation_engine.schemas import ScoredRecipe
        r = ScoredRecipe(
            recipe_id=recipe_id, spoonacular_id=None,
            title="T", meal_type="lunch",
            calories=400, protein_g=20, carb_g=40, fat_g=10,
            content_score=content, collab_score=collab,
        )
        return r

    def test_alpha_1_uses_only_content_score(self):
        """Alpha=1.0 should give final_score == content_score."""
        from app.ml.recommendation_engine.engine import _merge_scores
        candidates = [self._scored_recipe(1, content=0.8, collab=0.2)]
        result = _merge_scores(candidates, alpha=1.0)
        assert result[0].final_score == pytest.approx(0.8, rel=0.01)

    def test_alpha_0_uses_only_collab_score(self):
        """Alpha=0.0 should give final_score == collab_score."""
        from app.ml.recommendation_engine.engine import _merge_scores
        candidates = [self._scored_recipe(1, content=0.8, collab=0.4)]
        result = _merge_scores(candidates, alpha=0.0)
        assert result[0].final_score == pytest.approx(0.4, rel=0.01)

    def test_balanced_alpha_blends_correctly(self):
        """Alpha=0.5 should average content and collab."""
        from app.ml.recommendation_engine.engine import _merge_scores
        candidates = [self._scored_recipe(1, content=0.6, collab=0.4)]
        result = _merge_scores(candidates, alpha=0.5)
        assert result[0].final_score == pytest.approx(0.5, rel=0.01)

    def test_mutates_candidates_in_place(self):
        """_merge_scores should mutate final_score in the same objects."""
        from app.ml.recommendation_engine.engine import _merge_scores
        candidates = [self._scored_recipe(1, content=0.7, collab=0.3)]
        before_id = id(candidates[0])
        result = _merge_scores(candidates, alpha=0.7)
        assert id(result[0]) == before_id


class TestGetRecommendations:
    """Integration-style tests for engine.get_recommendations()."""

    def _seed_recipe_row(self, db_session, title="Seed Recipe", meal_type="lunch"):
        from app.models import recipe, MealType
        r = recipe(
            title=title,
            meal_type=meal_type,
            servings=2, cook_time_min=20,
            total_calories=400.0, total_protein_g=25.0,
            total_carb_g=40.0, total_fat_g=10.0,
            is_custom=False, is_public=False,
        )
        db_session.add(r)
        db_session.commit()
        db_session.refresh(r)
        return r

    def _seed_active_goal(self, db_session, user_id: int):
        from app.models import dietary_goal, GoalType, WeeklyGoalRate
        g = dietary_goal(
            user_id=user_id,
            goal_type=GoalType.maintain,
            target_weight_kg=70.0,
            weekly_goal_rate=WeeklyGoalRate.moderate,
            daily_calorie_target=2000,
            daily_protein_g=150,
            daily_carb_g=200,
            daily_fat_g=65,
            is_active=True,
        )
        db_session.add(g)
        db_session.commit()
        return g

    def test_returns_response_schema(self, db_session):
        """get_recommendations should return a RecommendationResponse."""
        from app.ml.recommendation_engine.engine import get_recommendations
        from app.ml.recommendation_engine.schemas import RecommendationRequest, RecommendationResponse
        from app.models import MealType
        from app.test.utils import create_test_user

        u = create_test_user(db_session, email="rec_schema@test.com")
        self._seed_recipe_row(db_session, meal_type="lunch")
        self._seed_active_goal(db_session, u.user_id)

        req = RecommendationRequest(meal_type=MealType.lunch, top_n=5)
        response = get_recommendations(db_session, user_id=u.user_id, request=req)
        assert isinstance(response, RecommendationResponse)
        assert response.meal_type == MealType.lunch
        assert isinstance(response.recommendations, list)

    def test_no_active_goal_returns_fallback_by_calories(self, db_session):
        """User with no active goal should still receive recommendations (sorted by calories)."""
        from app.ml.recommendation_engine.engine import get_recommendations
        from app.ml.recommendation_engine.schemas import RecommendationRequest
        from app.models import MealType
        from app.test.utils import create_test_user

        u = create_test_user(db_session, email="rec_no_goal@test.com")
        self._seed_recipe_row(db_session, title="High Cal", meal_type="dinner")
        self._seed_recipe_row(db_session, title="Low Cal", meal_type="dinner")

        req = RecommendationRequest(meal_type=MealType.dinner, top_n=10)
        response = get_recommendations(db_session, user_id=u.user_id, request=req)
        assert isinstance(response.recommendations, list)
        # Fallback: no error raised, remaining_budget.remaining_calories == 0
        assert response.remaining_budget.remaining_calories == 0

    def test_empty_catalogue_returns_empty_list(self, db_session):
        """If no recipes exist for the meal_type, return an empty recommendations list."""
        from app.ml.recommendation_engine.engine import get_recommendations
        from app.ml.recommendation_engine.schemas import RecommendationRequest
        from app.models import MealType
        from app.test.utils import create_test_user

        u = create_test_user(db_session, email="rec_empty@test.com")
        self._seed_active_goal(db_session, u.user_id)

        req = RecommendationRequest(meal_type=MealType.breakfast, top_n=5)
        response = get_recommendations(db_session, user_id=u.user_id, request=req)
        assert response.recommendations == []