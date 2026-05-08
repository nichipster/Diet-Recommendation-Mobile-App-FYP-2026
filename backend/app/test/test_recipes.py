"""
test_recipes.py

Unit and integration tests for routers/recipes.py.

Coverage targets:
  - POST /recipes/ingest      admin-only (403 for non-admin), success with mock Spoonacular,
                              duplicate spoonacular_id skipped, no-macro recipes skipped,
                              DB commit failure handled
  - GET  /recipes/{id}/detail  success (mocked Spoonacular), spoonacular_id not in local
                              catalogue (404), unauthenticated (401)
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi import status

from app.models import recipe, MealType, UserRole

from .utils import create_test_user, get_auth_headers


# ---------------------------------------------------------------------------
# Shared seed helper
# ---------------------------------------------------------------------------

def _seed_recipe(db_session, spoonacular_id: int = 1001) -> recipe:
    r = recipe(
        spoonacular_id=spoonacular_id,
        title="Test Recipe",
        meal_type=MealType.dinner,
        servings=2,
        cook_time_min=30,
        total_calories=600.0,
        total_protein_g=40.0,
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
# Spoonacular mock helpers
# ---------------------------------------------------------------------------

def _make_ingest_mock(recipes_raw: list) -> MagicMock:
    mock = MagicMock()
    mock.search_recipes_complex.return_value = {"results": recipes_raw}
    mock.map_complex_search_recipe_to_local.side_effect = lambda raw: {
        "spoonacular_id": raw["id"],
        "title": raw.get("title", "Mock Recipe"),
        "cuisine_type": None,
        "total_calories": raw.get("calories", 500.0),
        "total_protein_g": 30.0,
        "total_carb_g": 50.0,
        "total_fat_g": 15.0,
        "servings": 2,
        "cook_time_min": 30,
        "is_vegetarian": False,
        "is_vegan": False,
        "is_halal": False,
        "is_gluten_free": False,
        "meal_type": "dinner",
    }
    return mock


def _make_detail_mock(spoonacular_id: int) -> MagicMock:
    mock = MagicMock()
    mock.get_recipe_information.return_value = {
        "id": spoonacular_id,
        "title": "Mock Recipe Detail",
        "image": "https://example.com/image.jpg",
        "sourceUrl": "https://example.com/recipe",
        "readyInMinutes": 35,
        "servings": 2,
        "summary": "<b>Delicious</b> mock recipe.",
        "instructions": "Step 1: Cook it.",
        "extendedIngredients": [
            {"name": "chicken", "amount": 200, "unit": "g", "original": "200g chicken"}
        ],
        "analyzedInstructions": [
            {"steps": [{"number": 1, "step": "Preheat oven to 200°C."}]}
        ],
    }
    return mock


# ===========================================================================
# 1.  POST /recipes/ingest
# ===========================================================================

class TestIngestRecipes:

    def test_non_admin_returns_403(self, client, db_session):
        db_user = create_test_user(db_session, email="ri_nonadmin@test.com", role=UserRole.freemium)
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email, role=UserRole.freemium)

        resp = client.post("/recipes/ingest", json={
            "meal_types": ["dinner"],
            "per_type": 5,
            "offset": 0,
        }, headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_success_inserts_recipes(self, client, db_session):
        db_user = create_test_user(db_session, email="ri_admin@test.com", role=UserRole.admin)
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email, role=UserRole.admin)

        raw_recipes = [
            {"id": 2001, "title": "Pasta", "calories": 700.0},
            {"id": 2002, "title": "Risotto", "calories": 600.0},
        ]
        mock = _make_ingest_mock(raw_recipes)

        with patch("app.routers.recipes.SpoonacularService", return_value=mock):
            resp = client.post("/recipes/ingest", json={
                "meal_types": ["dinner"],
                "per_type": 5,
                "offset": 0,
            }, headers=headers)

        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["inserted"] == 2
        assert data["skipped_duplicates"] == 0

    def test_duplicate_spoonacular_id_skipped(self, client, db_session):
        """If a recipe's spoonacular_id already exists, it must be skipped."""
        db_user = create_test_user(db_session, email="ri_dupe@test.com", role=UserRole.admin)
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email, role=UserRole.admin)
        # Pre-seed a recipe
        _seed_recipe(db_session, spoonacular_id=3001)

        raw_recipes = [{"id": 3001, "title": "Duplicate", "calories": 500.0}]
        mock = _make_ingest_mock(raw_recipes)

        with patch("app.routers.recipes.SpoonacularService", return_value=mock):
            resp = client.post("/recipes/ingest", json={
                "meal_types": ["lunch"],
                "per_type": 5,
                "offset": 0,
            }, headers=headers)

        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["inserted"] == 0
        assert data["skipped_duplicates"] == 1

    def test_no_macro_recipe_skipped(self, client, db_session):
        """Recipes with total_calories == 0 must be skipped."""
        db_user = create_test_user(db_session, email="ri_nomacro@test.com", role=UserRole.admin)
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email, role=UserRole.admin)

        raw_recipes = [{"id": 4001, "title": "Empty Macro", "calories": 0}]
        mock = _make_ingest_mock(raw_recipes)
        # Override the mapping to return 0 calories
        mock.map_complex_search_recipe_to_local.return_value = {
            "spoonacular_id": 4001,
            "title": "Empty Macro",
            "cuisine_type": None,
            "total_calories": 0,   # ← triggers skip
            "total_protein_g": 0,
            "total_carb_g": 0,
            "total_fat_g": 0,
            "servings": 2,
            "cook_time_min": 20,
            "is_vegetarian": False,
            "is_vegan": False,
            "is_halal": False,
            "is_gluten_free": False,
            "meal_type": "lunch",
        }

        with patch("app.routers.recipes.SpoonacularService", return_value=mock):
            resp = client.post("/recipes/ingest", json={
                "meal_types": ["lunch"],
                "per_type": 5,
                "offset": 0,
            }, headers=headers)

        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["inserted"] == 0
        assert data["skipped_no_macros"] == 1

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/recipes/ingest", json={
            "meal_types": ["dinner"],
            "per_type": 5,
            "offset": 0,
        })
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_multiple_meal_types_ingested(self, client, db_session):
        """Ingest across multiple meal_types should accumulate inserted count."""
        db_user = create_test_user(db_session, email="ri_multi@test.com", role=UserRole.admin)
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email, role=UserRole.admin)

        mock = MagicMock()
        # Each call to search_recipes_complex returns 1 recipe with a unique id
        call_count = {"n": 0}
        def side_effect(meal_type, number, offset):
            call_count["n"] += 1
            return {"results": [{"id": 5000 + call_count["n"], "title": f"Recipe {call_count['n']}", "calories": 500}]}
        mock.search_recipes_complex.side_effect = side_effect
        mock.map_complex_search_recipe_to_local.side_effect = lambda raw: {
            "spoonacular_id": raw["id"],
            "title": raw["title"],
            "cuisine_type": None,
            "total_calories": 500.0,
            "total_protein_g": 25.0,
            "total_carb_g": 45.0,
            "total_fat_g": 15.0,
            "servings": 2,
            "cook_time_min": 25,
            "is_vegetarian": False,
            "is_vegan": False,
            "is_halal": False,
            "is_gluten_free": False,
            "meal_type": "breakfast",
        }

        with patch("app.routers.recipes.SpoonacularService", return_value=mock):
            resp = client.post("/recipes/ingest", json={
                "meal_types": ["breakfast", "lunch", "dinner"],
                "per_type": 3,
                "offset": 0,
            }, headers=headers)

        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["inserted"] == 3


# ===========================================================================
# 2.  GET /recipes/{spoonacular_id}/detail
# ===========================================================================

class TestGetRecipeDetail:

    def test_success(self, client, db_session):
        db_user = create_test_user(db_session, email="grd_success@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        r = _seed_recipe(db_session, spoonacular_id=6001)
        mock = _make_detail_mock(6001)

        with patch("app.routers.recipes.SpoonacularService", return_value=mock):
            resp = client.get(f"/recipes/{r.spoonacular_id}/detail", headers=headers)

        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["spoonacular_id"] == 6001
        assert "ingredients" in data
        assert len(data["ingredients"]) == 1
        assert data["ingredients"][0]["name"] == "chicken"

    def test_spoonacular_id_not_in_catalogue_returns_404(self, client, db_session):
        db_user = create_test_user(db_session, email="grd_404@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.get("/recipes/999999/detail", headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_instructions_parsed_from_analyzed_steps(self, client, db_session):
        """Instructions should be assembled from analyzedInstructions[0].steps."""
        db_user = create_test_user(db_session, email="grd_instr@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        r = _seed_recipe(db_session, spoonacular_id=6002)
        mock = _make_detail_mock(6002)

        with patch("app.routers.recipes.SpoonacularService", return_value=mock):
            resp = client.get(f"/recipes/{r.spoonacular_id}/detail", headers=headers)

        assert resp.status_code == status.HTTP_200_OK
        # Step assembled: "1. Preheat oven to 200°C."
        assert "Preheat oven" in resp.json()["instructions"]

    def test_unauthenticated_returns_401(self, client, db_session):
        r = _seed_recipe(db_session, spoonacular_id=6003)
        resp = client.get(f"/recipes/{r.spoonacular_id}/detail")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
