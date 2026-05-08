"""
test_recommendations.py

Unit and integration tests for routers/recommendations.py.

Coverage targets:
  - POST /recommendations/     authenticated success (mocked engine),
                               unauthenticated (401),
                               empty recipe catalogue returns empty list,
                               response schema validated
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi import status

from app.models import (
    user_profile,
    user_preferences,
    dietary_goal,
    recipe,
    MealType,
    GoalType,
    WeeklyGoalRate,
    Gender,
    ActivityLevel,
    UserRole,
)
from app.ml.recommendation_engine.schemas import (
    RecommendationResponse,
    RecommendationRequest,
    UserGoalContext,
    ScoredRecipe,
)

from .utils import create_test_user, get_auth_headers


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------

def _seed_profile(db_session, user_id: int):
    p = user_profile(
        user_id=user_id,
        gender=Gender.male,
        dob="1995-01-01",
        height_cm=175.0,
        weight_kg=75.0,
        activity_level=ActivityLevel.sedentary,
        tdee=2000,
    )
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)
    return p


def _seed_goal(db_session, user_id: int):
    g = dietary_goal(
        user_id=user_id,
        goal_type=GoalType.maintain,
        target_weight_kg=75.0,
        weekly_goal_rate=WeeklyGoalRate.stagnant,
        daily_calorie_target=2000,
        daily_protein_g=150.0,
        daily_carb_g=200.0,
        daily_fat_g=65.0,
        is_active=True,
    )
    db_session.add(g)
    db_session.commit()
    db_session.refresh(g)
    return g


def _seed_preferences(db_session, user_id: int):
    p = user_preferences(user_id=user_id)
    db_session.add(p)
    db_session.commit()
    return p


def _seed_recipe(db_session, spoonacular_id: int, meal_type: MealType = MealType.dinner) -> recipe:
    r = recipe(
        spoonacular_id=spoonacular_id,
        title=f"Recipe {spoonacular_id}",
        meal_type=meal_type,
        servings=2,
        cook_time_min=30,
        total_calories=600.0,
        total_protein_g=30.0,
        total_carb_g=60.0,
        total_fat_g=20.0,
        is_custom=False,
        is_public=False,
    )
    db_session.add(r)
    db_session.commit()
    db_session.refresh(r)
    return r


# ---------------------------------------------------------------------------
# Shared mock recommendation response
# ---------------------------------------------------------------------------

def _make_mock_response(meal_type: MealType = MealType.dinner) -> RecommendationResponse:
    budget = UserGoalContext(
        user_id=1,
        remaining_calories=1500.0,
        remaining_protein_g=120.0,
        remaining_carb_g=180.0,
        remaining_fat_g=50.0,
        goal_type="maintain",
    )
    scored = ScoredRecipe(
        recipe_id=1,
        spoonacular_id=1001,
        title="Mock Recipe",
        meal_type=meal_type,
        calories=600.0,
        protein_g=30.0,
        carb_g=60.0,
        fat_g=20.0,
        content_score=0.85,
        collab_score=0.70,
        final_score=0.78,
    )
    return RecommendationResponse(
        meal_type=meal_type,
        recommendations=[scored],
        remaining_budget=budget,
    )


# ===========================================================================
# 1.  POST /recommendations/
# ===========================================================================

class TestRecommendMeals:

    def test_authenticated_success(self, client, db_session):
        """Engine returns mocked recommendations; route should return 200 with schema."""
        db_user = create_test_user(db_session, email="rec_success@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        mock_response = _make_mock_response(MealType.dinner)

        with patch("app.routers.recommendations.get_recommendations", return_value=mock_response):
            resp = client.post("/recommendations/", json={
                "meal_type": "dinner",
                "top_n": 5,
            }, headers=headers)

        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "recommendations" in data
        assert "remaining_budget" in data
        assert data["meal_type"] == "dinner"

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/recommendations/", json={
            "meal_type": "dinner",
            "top_n": 5,
        })
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_empty_catalogue_returns_empty_list(self, client, db_session):
        """Engine called with no recipes seeded → mocked to return empty recommendations."""
        db_user = create_test_user(db_session, email="rec_empty@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        budget = UserGoalContext(
            user_id=db_user.user_id,
            remaining_calories=2000.0,
            remaining_protein_g=150.0,
            remaining_carb_g=200.0,
            remaining_fat_g=65.0,
            goal_type="maintain",
        )
        empty_response = RecommendationResponse(
            meal_type=MealType.lunch,
            recommendations=[],
            remaining_budget=budget,
        )

        with patch("app.routers.recommendations.get_recommendations", return_value=empty_response):
            resp = client.post("/recommendations/", json={
                "meal_type": "lunch",
                "top_n": 10,
            }, headers=headers)

        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["recommendations"] == []

    def test_response_schema_contains_required_fields(self, client, db_session):
        """Response must contain meal_type, recommendations list, and remaining_budget."""
        db_user = create_test_user(db_session, email="rec_schema@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        mock_response = _make_mock_response(MealType.breakfast)

        with patch("app.routers.recommendations.get_recommendations", return_value=mock_response):
            resp = client.post("/recommendations/", json={
                "meal_type": "breakfast",
                "top_n": 3,
            }, headers=headers)

        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        # Top-level keys
        assert set(data.keys()) >= {"meal_type", "recommendations", "remaining_budget"}
        # Budget fields
        budget = data["remaining_budget"]
        assert "remaining_calories" in budget
        assert "remaining_protein_g" in budget
        assert "remaining_carb_g" in budget
        assert "remaining_fat_g" in budget
        # Recommendation fields (if any exist)
        if data["recommendations"]:
            rec = data["recommendations"][0]
            assert "recipe_id" in rec
            assert "title" in rec
            assert "calories" in rec
            assert "final_score" in rec

    def test_top_n_boundary_value(self, client, db_session):
        """top_n of 1 and 50 should both be accepted as valid."""
        db_user = create_test_user(db_session, email="rec_topn@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        mock_response = _make_mock_response()

        with patch("app.routers.recommendations.get_recommendations", return_value=mock_response):
            for n in [1, 50]:
                resp = client.post("/recommendations/", json={
                    "meal_type": "dinner",
                    "top_n": n,
                }, headers=headers)
                assert resp.status_code == status.HTTP_200_OK

    def test_top_n_above_50_rejected(self, client, db_session):
        """top_n > 50 should be rejected by Pydantic validation (422)."""
        db_user = create_test_user(db_session, email="rec_topn_over@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.post("/recommendations/", json={
            "meal_type": "dinner",
            "top_n": 51,
        }, headers=headers)
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_invalid_meal_type_rejected(self, client, db_session):
        """An invalid meal_type string should return 422."""
        db_user = create_test_user(db_session, email="rec_badtype@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.post("/recommendations/", json={
            "meal_type": "supper",  # not in MealType enum
            "top_n": 5,
        }, headers=headers)
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
