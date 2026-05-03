"""
test_meal.py

Unit and integration tests for routers/meal.py.

Coverage targets:
Pure helpers (tested via side-effects / direct invocation):
  - recalculate_dietary_entry()   create, update, empty meal list (zeros)
  - build_meal_response()         all fields mapped, None → 0 for optional fields

Endpoint integration:
  - GET  /meal/                        meals on a date, empty day, unauthenticated
  - GET  /meal/dietary-entry           existing entry, no entry → zeros
  - GET  /meal/favorites               populated, empty list
  - POST /meal/                        success + scaling ratio, food not found (404), dietary_entry created
  - POST /meal/manual                  success, negative values rejected (422), dietary_entry created
  - POST /meal/custom/{id}             success + scaling, not found (404), wrong-user (404)
  - PATCH /meal/{id}/favorite          set True, set False, not found (404)
  - GET  /meal/{id}                    success, not found (404), wrong-user isolation
  - DELETE /meal/{id}                  success + dietary_entry updated, not found (404)
"""

import pytest
from datetime import datetime, date, timedelta, time
from zoneinfo import ZoneInfo
from fastapi import status

from app.models import (
    meal,
    food_item,
    custom_meal,
    dietary_entry,
    FoodSource,
)
from app.routers.meal import build_meal_response, recalculate_dietary_entry

from .utils import create_test_user, get_auth_headers

SG_TZ = ZoneInfo("Asia/Singapore")

TODAY = datetime.now(SG_TZ).date()
TODAY_DT = datetime.combine(TODAY, time(12, 0)).replace(tzinfo=SG_TZ)


# ---------------------------------------------------------------------------
# Shared seed helpers
# ---------------------------------------------------------------------------

def _seed_food_item(db_session, name="Chicken Breast", serving_size=100.0) -> food_item:
    """Insert a food_item row and return it."""
    fi = food_item(
        name=name,
        source=FoodSource.admin,
        serving_size=serving_size,
        serving_unit="g",
        calories=165.0,
        protein_g=31.0,
        carb_g=0.0,
        fat_g=3.6,
        sugar_g=0.0,
        fiber_g=0.0,
        sodium_mg=74.0,
    )
    db_session.add(fi)
    db_session.commit()
    db_session.refresh(fi)
    return fi


def _seed_custom_meal(db_session, user_id: int, name="My Salad") -> custom_meal:
    """Insert a custom_meal row and return it."""
    cm = custom_meal(
        user_id=user_id,
        name=name,
        emoji="🥗",
        emoji_bg="#00FF00",
        category="Salad",
        serving_size=200.0,
        serving_unit="g",
        calories=300.0,
        protein_g=10.0,
        carb_g=30.0,
        fat_g=5.0,
    )
    db_session.add(cm)
    db_session.commit()
    db_session.refresh(cm)
    return cm


def _seed_meal(db_session, user_id: int, consumed_at: datetime = None, is_favorite=False) -> meal:
    """Insert a meal row and return it."""
    m = meal(
        user_id=user_id,
        meal_name="Test Meal",
        consumed_at=consumed_at or TODAY_DT,
        source=FoodSource.manual,
        amount=100.0,
        unit="g",
        calories=200.0,
        protein_g=20.0,
        carb_g=15.0,
        fat_g=5.0,
        sugar_g=2.0,
        fiber_g=1.0,
        sodium_mg=300.0,
        is_favorite=is_favorite,
    )
    db_session.add(m)
    db_session.commit()
    db_session.refresh(m)
    return m


# ===========================================================================
# 1.  build_meal_response() — pure helper
# ===========================================================================

class TestBuildMealResponse:
    """Direct unit tests for the build_meal_response helper."""

    def test_all_fields_mapped(self, db_session):
        db_user = create_test_user(db_session, email="bmr@test.com")
        m = _seed_meal(db_session, db_user.user_id)
        resp = build_meal_response(m)

        assert resp.meal_id == m.meal_id
        assert resp.user_id == m.user_id
        assert resp.meal_name == m.meal_name
        assert resp.consumed_at == m.consumed_at
        assert resp.source == m.source
        assert resp.amount == m.amount
        assert resp.unit == m.unit
        assert resp.calories == m.calories
        assert resp.protein_g == m.protein_g
        assert resp.carb_g == m.carb_g
        assert resp.fat_g == m.fat_g
        assert resp.is_favorite == m.is_favorite

    def test_none_optional_fields_default_to_zero(self, db_session):
        """sugar_g, fiber_g, sodium_mg default to 0 when None."""
        db_user = create_test_user(db_session, email="bmr_none@test.com")
        m = meal(
            user_id=db_user.user_id,
            meal_name="Null Opts",
            consumed_at=TODAY_DT,
            source=FoodSource.manual,
            amount=100.0,
            unit="g",
            calories=100.0,
            protein_g=5.0,
            carb_g=10.0,
            fat_g=2.0,
            sugar_g=None,
            fiber_g=None,
            sodium_mg=None,
        )
        db_session.add(m)
        db_session.commit()
        db_session.refresh(m)

        resp = build_meal_response(m)
        assert resp.sugar_g == 0
        assert resp.fiber_g == 0
        assert resp.sodium_mg == 0


# ===========================================================================
# 2.  recalculate_dietary_entry() — pure helper (DB-integrated)
# ===========================================================================

class TestRecalculateDietaryEntry:
    """Tests the recalculate_dietary_entry helper through direct invocation."""

    def test_creates_new_entry_when_none_exists(self, db_session):
        """First meal on a date should create a new dietary_entry row."""
        db_user = create_test_user(db_session, email="rde_create@test.com")
        _seed_meal(db_session, db_user.user_id, consumed_at=TODAY_DT)

        recalculate_dietary_entry(db_session, db_user.user_id, TODAY)

        entry = db_session.exec(
            __import__("sqlmodel", fromlist=["select"]).select(dietary_entry).where(
                dietary_entry.user_id == db_user.user_id,
                dietary_entry.entry_date == TODAY
            )
        ).first()
        assert entry is not None
        assert entry.total_calories_consumed == pytest.approx(200.0)
        assert entry.total_protein_g == pytest.approx(20.0)

    def test_updates_existing_entry(self, db_session):
        """Adding a second meal should sum both meals in the entry."""
        db_user = create_test_user(db_session, email="rde_update@test.com")
        _seed_meal(db_session, db_user.user_id, consumed_at=TODAY_DT)
        recalculate_dietary_entry(db_session, db_user.user_id, TODAY)

        # Add second meal
        m2 = meal(
            user_id=db_user.user_id,
            meal_name="Second Meal",
            consumed_at=TODAY_DT,
            source=FoodSource.manual,
            amount=50.0,
            unit="g",
            calories=100.0,
            protein_g=10.0,
            carb_g=5.0,
            fat_g=2.0,
        )
        db_session.add(m2)
        db_session.commit()

        recalculate_dietary_entry(db_session, db_user.user_id, TODAY)

        entry = db_session.exec(
            __import__("sqlmodel", fromlist=["select"]).select(dietary_entry).where(
                dietary_entry.user_id == db_user.user_id,
                dietary_entry.entry_date == TODAY
            )
        ).first()
        assert entry.total_calories_consumed == pytest.approx(300.0)

    def test_empty_day_zeroes_entry(self, db_session):
        """Deleting all meals on a date should zero out the existing entry."""
        from sqlmodel import select

        db_user = create_test_user(db_session, email="rde_zero@test.com")
        m = _seed_meal(db_session, db_user.user_id)
        recalculate_dietary_entry(db_session, db_user.user_id, TODAY)

        # Remove the meal
        db_session.delete(m)
        db_session.commit()

        recalculate_dietary_entry(db_session, db_user.user_id, TODAY)

        entry = db_session.exec(
            select(dietary_entry).where(
                dietary_entry.user_id == db_user.user_id,
                dietary_entry.entry_date == TODAY
            )
        ).first()
        assert entry.total_calories_consumed == 0


# ===========================================================================
# 3.  GET /meal/ — list meals by date
# ===========================================================================

class TestGetMealsByDate:

    def test_returns_meals_for_date(self, client, db_session):
        db_user = create_test_user(db_session, email="gmd@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        _seed_meal(db_session, db_user.user_id)

        resp = client.get(f"/meal/?entry_date={TODAY}", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert len(data) == 1
        assert data[0]["meal_name"] == "Test Meal"

    def test_returns_empty_list_for_day_with_no_meals(self, client, db_session):
        db_user = create_test_user(db_session, email="gmd_empty@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        past_date = (TODAY - timedelta(days=30)).isoformat()
        resp = client.get(f"/meal/?entry_date={past_date}", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == []

    def test_unauthenticated_returns_401(self, client, db_session):
        resp = client.get(f"/meal/?entry_date={TODAY}")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_meals_ordered_by_consumed_at(self, client, db_session):
        """Multiple meals on a date should be returned in ascending time order."""
        db_user = create_test_user(db_session, email="gmd_order@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        early = datetime.combine(TODAY, time(8, 0)).replace(tzinfo=SG_TZ)
        late = datetime.combine(TODAY, time(12, 0)).replace(tzinfo=SG_TZ)

        m_late = _seed_meal(db_session, db_user.user_id, consumed_at=late)
        m_late.meal_name = "Lunch"
        db_session.add(m_late)

        m_early = _seed_meal(db_session, db_user.user_id, consumed_at=early)
        m_early.meal_name = "Breakfast"
        db_session.add(m_early)
        db_session.commit()

        resp = client.get(f"/meal/?entry_date={TODAY}", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        names = [m["meal_name"] for m in resp.json()]
        # Breakfast (08:00) should appear before Lunch (12:00)
        breakfast_idx = names.index("Breakfast")
        lunch_idx = names.index("Lunch")
        assert breakfast_idx < lunch_idx


# ===========================================================================
# 4.  GET /meal/dietary-entry
# ===========================================================================

class TestGetDietaryEntry:

    def test_returns_existing_entry(self, client, db_session):
        db_user = create_test_user(db_session, email="gde@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        # Seed a dietary_entry
        entry = dietary_entry(
            user_id=db_user.user_id,
            entry_date=TODAY,
            total_calories_consumed=500.0,
            total_protein_g=40.0,
            total_carb_g=50.0,
            total_fat_g=15.0,
        )
        db_session.add(entry)
        db_session.commit()

        resp = client.get(f"/meal/dietary-entry?entry_date={TODAY}", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["total_calories_consumed"] == pytest.approx(500.0)
        assert data["total_protein_g"] == pytest.approx(40.0)

    def test_returns_zeros_when_no_entry(self, client, db_session):
        db_user = create_test_user(db_session, email="gde_zero@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        past_date = (TODAY - timedelta(days=60)).isoformat()
        resp = client.get(f"/meal/dietary-entry?entry_date={past_date}", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["total_calories_consumed"] == 0
        assert data["total_protein_g"] == 0
        assert data["total_carb_g"] == 0
        assert data["total_fat_g"] == 0

    def test_unauthenticated_returns_401(self, client):
        resp = client.get(f"/meal/dietary-entry?entry_date={TODAY}")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# 5.  GET /meal/favorites
# ===========================================================================

class TestGetFavoriteMeals:

    def test_returns_favorited_meals(self, client, db_session):
        db_user = create_test_user(db_session, email="fav@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        _seed_meal(db_session, db_user.user_id, is_favorite=True)
        _seed_meal(db_session, db_user.user_id, is_favorite=False)

        resp = client.get("/meal/favorites", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert len(data) == 1
        assert data[0]["is_favorite"] is True

    def test_returns_empty_list_when_no_favorites(self, client, db_session):
        db_user = create_test_user(db_session, email="fav_empty@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.get("/meal/favorites", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == []

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/meal/favorites")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# 6.  POST /meal/ — create from food_item
# ===========================================================================

class TestCreateMealFromFood:

    def test_success_with_correct_scaling(self, client, db_session):
        """Nutritional values must be scaled by amount / serving_size ratio."""
        db_user = create_test_user(db_session, email="cmf@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        fi = _seed_food_item(db_session)  # serving_size=100, calories=165

        payload = {"food_id": fi.food_id, "amount": 200.0}
        resp = client.post("/meal/", json=payload, headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        # ratio = 200 / 100 = 2  →  calories = 165 * 2 = 330
        assert data["calories"] == pytest.approx(330.0)
        assert data["protein_g"] == pytest.approx(62.0)  # 31 * 2

    def test_food_not_found_returns_404(self, client, db_session):
        db_user = create_test_user(db_session, email="cmf_404@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.post("/meal/", json={"food_id": 999999, "amount": 100.0}, headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_dietary_entry_created_after_meal(self, client, db_session):
        """dietary_entry must be created/updated after logging a meal."""
        from sqlmodel import select

        db_user = create_test_user(db_session, email="cmf_entry@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        fi = _seed_food_item(db_session, name="Rice")

        client.post("/meal/", json={"food_id": fi.food_id, "amount": 100.0}, headers=headers)

        entry = db_session.exec(
            select(dietary_entry).where(
                dietary_entry.user_id == db_user.user_id,
                dietary_entry.entry_date == TODAY
            )
        ).first()
        assert entry is not None
        assert entry.total_calories_consumed > 0

    def test_custom_meal_name_overrides_food_name(self, client, db_session):
        """meal_name in request should override the food_item name."""
        db_user = create_test_user(db_session, email="cmf_name@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        fi = _seed_food_item(db_session, name="Original Name")

        resp = client.post("/meal/", json={
            "food_id": fi.food_id,
            "amount": 100.0,
            "meal_name": "My Custom Label",
        }, headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.json()["meal_name"] == "My Custom Label"

    def test_unauthenticated_returns_401(self, client, db_session):
        fi = _seed_food_item(db_session, name="Anon Food")
        resp = client.post("/meal/", json={"food_id": fi.food_id, "amount": 100.0})
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# 7.  POST /meal/manual
# ===========================================================================

class TestCreateManualMeal:

    def test_success(self, client, db_session):
        db_user = create_test_user(db_session, email="manual@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        payload = {
            "meal_name": "Protein Shake",
            "amount": 300.0,
            "unit": "ml",
            "calories": 250.0,
            "protein_g": 25.0,
            "carb_g": 20.0,
            "fat_g": 5.0,
        }
        resp = client.post("/meal/manual", json=payload, headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data["meal_name"] == "Protein Shake"
        assert data["calories"] == pytest.approx(250.0)
        assert data["source"] == "manual"

    def test_negative_calories_rejected(self, client, db_session):
        """calories field uses ge=0, so negative values should return 422."""
        db_user = create_test_user(db_session, email="manual_neg@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        payload = {
            "meal_name": "Bad Entry",
            "amount": 100.0,
            "calories": -50.0,
        }
        resp = client.post("/meal/manual", json=payload, headers=headers)
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_zero_amount_rejected(self, client, db_session):
        """amount uses gt=0 so 0 must be rejected."""
        db_user = create_test_user(db_session, email="manual_zero_amt@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        payload = {
            "meal_name": "Zero Amount",
            "amount": 0.0,
            "calories": 100.0,
        }
        resp = client.post("/meal/manual", json=payload, headers=headers)
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_dietary_entry_created(self, client, db_session):
        """dietary_entry aggregate must exist after manual log."""
        from sqlmodel import select

        db_user = create_test_user(db_session, email="manual_entry@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        client.post("/meal/manual", json={
            "meal_name": "Oatmeal",
            "amount": 100.0,
            "calories": 150.0,
            "protein_g": 5.0,
            "carb_g": 27.0,
            "fat_g": 3.0,
        }, headers=headers)

        entry = db_session.exec(
            select(dietary_entry).where(
                dietary_entry.user_id == db_user.user_id,
                dietary_entry.entry_date == TODAY
            )
        ).first()
        assert entry is not None
        assert entry.total_calories_consumed == pytest.approx(150.0)

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/meal/manual", json={"meal_name": "X", "amount": 100})
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# 8.  POST /meal/custom/{custom_meal_id}
# ===========================================================================

class TestCreateMealFromCustomMeal:

    def test_success_with_scaling(self, client, db_session):
        """Nutrition should scale by amount / serving_size ratio."""
        db_user = create_test_user(db_session, email="cmcm@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        cm = _seed_custom_meal(db_session, db_user.user_id)  # serving=200, cal=300

        # Request 100g → ratio = 0.5 → calories = 150
        resp = client.post(f"/meal/custom/{cm.custom_meal_id}", json={"amount": 100.0}, headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data["calories"] == pytest.approx(150.0)
        assert data["source"] == "custom"

    def test_custom_meal_not_found_returns_404(self, client, db_session):
        db_user = create_test_user(db_session, email="cmcm_404@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.post("/meal/custom/999999", json={"amount": 100.0}, headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_other_users_custom_meal_returns_404(self, client, db_session):
        """A user must not be able to log another user's custom meal."""
        owner = create_test_user(db_session, email="cmcm_owner@test.com")
        attacker = create_test_user(db_session, email="cmcm_attacker@test.com")
        cm = _seed_custom_meal(db_session, owner.user_id)

        headers = get_auth_headers(user_id=attacker.user_id, email=attacker.email)
        resp = client.post(f"/meal/custom/{cm.custom_meal_id}", json={"amount": 100.0}, headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_optional_meal_name_uses_custom_meal_name(self, client, db_session):
        db_user = create_test_user(db_session, email="cmcm_name@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        cm = _seed_custom_meal(db_session, db_user.user_id, name="My Salad")

        resp = client.post(f"/meal/custom/{cm.custom_meal_id}", json={"amount": 200.0}, headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.json()["meal_name"] == "My Salad"


# ===========================================================================
# 9.  PATCH /meal/{id}/favorite
# ===========================================================================

class TestUpdateMealFavorite:

    def test_set_favorite_true(self, client, db_session):
        db_user = create_test_user(db_session, email="fav_set@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        m = _seed_meal(db_session, db_user.user_id, is_favorite=False)

        resp = client.patch(
            f"/meal/{m.meal_id}/favorite",
            json={"is_favorite": True},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["is_favorite"] is True

    def test_set_favorite_false(self, client, db_session):
        db_user = create_test_user(db_session, email="fav_unset@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        m = _seed_meal(db_session, db_user.user_id, is_favorite=True)

        resp = client.patch(
            f"/meal/{m.meal_id}/favorite",
            json={"is_favorite": False},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["is_favorite"] is False

    def test_meal_not_found_returns_404(self, client, db_session):
        db_user = create_test_user(db_session, email="fav_notfound@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.patch(
            "/meal/999999/favorite",
            json={"is_favorite": True},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_other_users_meal_returns_404(self, client, db_session):
        owner = create_test_user(db_session, email="fav_owner@test.com")
        attacker = create_test_user(db_session, email="fav_attacker@test.com")
        m = _seed_meal(db_session, owner.user_id)

        headers = get_auth_headers(user_id=attacker.user_id, email=attacker.email)
        resp = client.patch(
            f"/meal/{m.meal_id}/favorite",
            json={"is_favorite": True},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND


# ===========================================================================
# 10.  GET /meal/{id} — single meal detail
# ===========================================================================

class TestGetMealDetail:

    def test_success(self, client, db_session):
        db_user = create_test_user(db_session, email="gmd_detail@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        m = _seed_meal(db_session, db_user.user_id)

        resp = client.get(f"/meal/{m.meal_id}", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["meal_id"] == m.meal_id

    def test_not_found_returns_404(self, client, db_session):
        db_user = create_test_user(db_session, email="gmd_detail_404@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.get("/meal/999999", headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_other_users_meal_returns_404(self, client, db_session):
        owner = create_test_user(db_session, email="gmd_owner@test.com")
        attacker = create_test_user(db_session, email="gmd_attacker@test.com")
        m = _seed_meal(db_session, owner.user_id)

        headers = get_auth_headers(user_id=attacker.user_id, email=attacker.email)
        resp = client.get(f"/meal/{m.meal_id}", headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND


# ===========================================================================
# 11.  DELETE /meal/{id}
# ===========================================================================

class TestDeleteMeal:

    def test_success(self, client, db_session):
        from sqlmodel import select

        db_user = create_test_user(db_session, email="del@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
        m = _seed_meal(db_session, db_user.user_id)

        resp = client.delete(f"/meal/{m.meal_id}", headers=headers)
        assert resp.status_code == status.HTTP_204_NO_CONTENT

        deleted = db_session.exec(
            select(meal).where(meal.meal_id == m.meal_id)
        ).first()
        assert deleted is None

    def test_dietary_entry_zeroed_after_delete(self, client, db_session):
        """After deleting the only meal on a date, the dietary_entry should be zeroed."""
        from sqlmodel import select

        db_user = create_test_user(db_session, email="del_entry@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        # Log a manual meal (this also creates the dietary_entry via the endpoint)
        post_resp = client.post("/meal/manual", json={
            "meal_name": "Lunch",
            "amount": 100.0,
            "calories": 400.0,
            "protein_g": 30.0,
            "carb_g": 40.0,
            "fat_g": 10.0,
        }, headers=headers)
        meal_id = post_resp.json()["meal_id"]

        # Delete the meal
        client.delete(f"/meal/{meal_id}", headers=headers)

        entry = db_session.exec(
            select(dietary_entry).where(
                dietary_entry.user_id == db_user.user_id,
                dietary_entry.entry_date == TODAY
            )
        ).first()
        assert entry is not None
        assert entry.total_calories_consumed == pytest.approx(0.0)

    def test_not_found_returns_404(self, client, db_session):
        db_user = create_test_user(db_session, email="del_404@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.delete("/meal/999999", headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_other_users_meal_returns_404(self, client, db_session):
        owner = create_test_user(db_session, email="del_owner@test.com")
        attacker = create_test_user(db_session, email="del_attacker@test.com")
        m = _seed_meal(db_session, owner.user_id)

        headers = get_auth_headers(user_id=attacker.user_id, email=attacker.email)
        resp = client.delete(f"/meal/{m.meal_id}", headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND
