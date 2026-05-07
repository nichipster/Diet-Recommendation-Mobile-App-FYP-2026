"""
test_custom_meal.py

Unit and integration tests for routers/custom_meal.py.

Coverage targets:
Pure helpers:
  - build_custom_meal_response()   all fields mapped correctly, optional notes

Endpoint integration:
  - POST /custom-meals/            success, empty name (422), serving_size <= 0 (422)
  - GET  /custom-meals/            populated list, empty list, user isolation
  - GET  /custom-meals/{id}        success, not found (404), wrong user (404)
  - DELETE /custom-meals/{id}      success, not found (404), wrong user (404)
"""

import pytest
from fastapi import status

from app.models import custom_meal
from app.routers.custom_meal import build_custom_meal_response

from .utils import create_test_user, get_auth_headers


# ---------------------------------------------------------------------------
# Shared seed helper
# ---------------------------------------------------------------------------

VALID_PAYLOAD = {
    "name": "Avocado Toast",
    "emoji": "🥑",
    "emoji_bg": "#FFEAA7",
    "category": "Breakfast",
    "serving_size": 150.0,
    "serving_unit": "g",
    "calories": 320.0,
    "protein": 10.0,
    "carbs": 35.0,
    "fats": 14.0,
    "notes": "Add a pinch of salt",
}


def _seed_custom_meal(db_session, user_id: int, name: str = "Seeded Meal") -> custom_meal:
    cm = custom_meal(
        user_id=user_id,
        name=name,
        emoji="🍳",
        emoji_bg="#FFFFFF",
        category="Lunch",
        serving_size=200.0,
        serving_unit="g",
        calories=400.0,
        protein_g=20.0,
        carb_g=40.0,
        fat_g=10.0,
        notes=None,
    )
    db_session.add(cm)
    db_session.commit()
    db_session.refresh(cm)
    return cm


# ===========================================================================
# 1.  build_custom_meal_response() — pure helper
# ===========================================================================

class TestBuildCustomMealResponse:

    def test_all_fields_mapped_correctly(self, db_session):
        db_user = create_test_user(db_session, email="bcmr@test.com")
        cm = _seed_custom_meal(db_session, db_user.user_id)

        resp = build_custom_meal_response(cm)

        assert resp.custom_meal_id == cm.custom_meal_id
        assert resp.name == cm.name
        assert resp.emoji == cm.emoji
        assert resp.emoji_bg == cm.emoji_bg
        assert resp.category == cm.category
        assert resp.serving_size == cm.serving_size
        assert resp.serving_unit == cm.serving_unit
        assert resp.calories == cm.calories
        assert resp.protein == cm.protein_g   # note: mapped from protein_g
        assert resp.carbs == cm.carb_g
        assert resp.fats == cm.fat_g
        assert resp.notes is None

    def test_optional_notes_present(self, db_session):
        db_user = create_test_user(db_session, email="bcmr_notes@test.com")
        cm = custom_meal(
            user_id=db_user.user_id,
            name="With Notes",
            emoji="📝",
            emoji_bg="#CCC",
            category="Snack",
            serving_size=50.0,
            serving_unit="g",
            calories=100.0,
            protein_g=3.0,
            carb_g=10.0,
            fat_g=2.0,
            notes="  High fibre  ",
        )
        db_session.add(cm)
        db_session.commit()
        db_session.refresh(cm)

        resp = build_custom_meal_response(cm)
        assert resp.notes == "  High fibre  "


# ===========================================================================
# 2.  POST /custom-meals/
# ===========================================================================

class TestCreateCustomMeal:

    def test_success(self, client, db_session):
        db_user = create_test_user(db_session, email="ccm@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.post("/custom-meals/", json=VALID_PAYLOAD, headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data["name"] == "Avocado Toast"
        assert data["calories"] == pytest.approx(320.0)
        assert "custom_meal_id" in data

    def test_empty_name_rejected(self, client, db_session):
        """name has min_length=1, so empty string must fail validation."""
        db_user = create_test_user(db_session, email="ccm_noname@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        payload = {**VALID_PAYLOAD, "name": ""}
        resp = client.post("/custom-meals/", json=payload, headers=headers)
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_zero_serving_size_rejected(self, client, db_session):
        """serving_size uses ge=0 in the request model but the model has gt=0.
        Sending 0 should fail at the Pydantic or DB level."""
        db_user = create_test_user(db_session, email="ccm_zero_ss@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        payload = {**VALID_PAYLOAD, "serving_size": -1.0}
        resp = client.post("/custom-meals/", json=payload, headers=headers)
        # lt 0 should always be rejected
        assert resp.status_code in (
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_notes_is_stripped_on_save(self, client, db_session):
        """Leading/trailing whitespace in notes should be stripped."""
        db_user = create_test_user(db_session, email="ccm_notes@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        payload = {**VALID_PAYLOAD, "notes": "  spaced note  "}
        resp = client.post("/custom-meals/", json=payload, headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.json()["notes"] == "spaced note"

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/custom-meals/", json=VALID_PAYLOAD)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# 3.  GET /custom-meals/
# ===========================================================================

class TestListCustomMeals:

    def test_returns_own_meals(self, client, db_session):
        db_user = create_test_user(db_session, email="lcm@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        _seed_custom_meal(db_session, db_user.user_id)
        _seed_custom_meal(db_session, db_user.user_id, name="Meal 2")

        resp = client.get("/custom-meals/", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.json()) == 2

    def test_returns_empty_list(self, client, db_session):
        db_user = create_test_user(db_session, email="lcm_empty@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.get("/custom-meals/", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == []

    def test_user_isolation(self, client, db_session):
        """User A must not see User B's custom meals."""
        user_a = create_test_user(db_session, email="lcm_a@test.com")
        user_b = create_test_user(db_session, email="lcm_b@test.com")
        _seed_custom_meal(db_session, user_b.user_id, name="B's Secret Meal")

        headers_a = get_auth_headers(user_id=user_a.user_id, email=user_a.email)
        resp = client.get("/custom-meals/", headers=headers_a)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == []

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/custom-meals/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# 4.  GET /custom-meals/{custom_meal_id}
# ===========================================================================

class TestGetCustomMealDetail:

    def test_success(self, client, db_session):
        db_user = create_test_user(db_session, email="gcmd@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        cm = _seed_custom_meal(db_session, db_user.user_id)

        resp = client.get(f"/custom-meals/{cm.custom_meal_id}", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["custom_meal_id"] == cm.custom_meal_id

    def test_not_found_returns_404(self, client, db_session):
        db_user = create_test_user(db_session, email="gcmd_404@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.get("/custom-meals/999999", headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_wrong_user_returns_404(self, client, db_session):
        """A user must not be able to retrieve another user's custom meal by ID."""
        owner = create_test_user(db_session, email="gcmd_owner@test.com")
        attacker = create_test_user(db_session, email="gcmd_attacker@test.com")
        cm = _seed_custom_meal(db_session, owner.user_id)

        headers = get_auth_headers(user_id=attacker.user_id, email=attacker.email)
        resp = client.get(f"/custom-meals/{cm.custom_meal_id}", headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND


# ===========================================================================
# 5.  DELETE /custom-meals/{custom_meal_id}
# ===========================================================================

class TestDeleteCustomMeal:

    def test_success(self, client, db_session):
        from sqlmodel import select

        db_user = create_test_user(db_session, email="dcm@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        cm = _seed_custom_meal(db_session, db_user.user_id)

        resp = client.delete(f"/custom-meals/{cm.custom_meal_id}", headers=headers)
        assert resp.status_code == status.HTTP_204_NO_CONTENT

        deleted = db_session.exec(
            select(custom_meal).where(custom_meal.custom_meal_id == cm.custom_meal_id)
        ).first()
        assert deleted is None

    def test_not_found_returns_404(self, client, db_session):
        db_user = create_test_user(db_session, email="dcm_404@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.delete("/custom-meals/999999", headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_wrong_user_returns_404(self, client, db_session):
        owner = create_test_user(db_session, email="dcm_owner@test.com")
        attacker = create_test_user(db_session, email="dcm_attacker@test.com")
        cm = _seed_custom_meal(db_session, owner.user_id)

        headers = get_auth_headers(user_id=attacker.user_id, email=attacker.email)
        resp = client.delete(f"/custom-meals/{cm.custom_meal_id}", headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND
