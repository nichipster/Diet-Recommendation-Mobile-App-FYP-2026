"""
test_admin_food_database.py

Unit and integration tests for routers/admin_food_database.py.

Coverage targets:
  - GET    /admin/food-database/          admin, non-admin (403), correct items
  - POST   /admin/food-database/          success, wrong source (400), dup barcode (409),
                                          empty name (422), non-admin (403)
  - PATCH  /admin/food-database/{id}      success, not found (404), non-admin source (400),
                                          barcode conflict (409), empty body (400), non-admin (403)
  - DELETE /admin/food-database/{id}      success, not found (404), wrong source (400),
                                          non-admin (403)
"""

import pytest
from fastapi import status
from sqlmodel import select

from app.models import food_item, FoodSource, UserRole
from .utils import create_test_user, get_auth_headers


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _admin_headers(db_session, email: str = "food_db_admin@test.com") -> dict:
    admin = create_test_user(db_session, email=email, role=UserRole.admin)
    return get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)


def _food_payload(
    name: str = "Test Food Item",
    barcode: str | None = None,
    source: str = "admin",
) -> dict:
    """Returns a valid AdminFoodItemRequest payload."""
    payload: dict = {
        "name": name,
        "source": source,
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 200.0,
        "protein_g": 10.0,
        "carb_g": 25.0,
        "fat_g": 5.0,
        "sugar_g": 0.0,
        "fiber_g": 0.0,
        "sodium_mg": 0.0,
    }
    if barcode is not None:
        payload["barcode"] = barcode
    return payload


def _seed_admin_food(
    db_session,
    name: str = "Seeded Admin Food",
    barcode: str | None = None,
    source: FoodSource = FoodSource.admin,
) -> food_item:
    """Seeds a food_item row directly (bypassing router)."""
    food = food_item(
        name=name,
        source=source,
        barcode=barcode,
        serving_size=100.0,
        serving_unit="g",
        calories=150.0,
        protein_g=8.0,
        carb_g=20.0,
        fat_g=4.0,
        sugar_g=0.0,
        fiber_g=0.0,
        sodium_mg=0.0,
    )
    db_session.add(food)
    db_session.commit()
    db_session.refresh(food)
    return food


# ===========================================================================
# Endpoint: GET /admin/food-database/
# ===========================================================================

class TestGetAdminFoodDatabase:
    """Tests for GET /admin/food-database/."""

    def test_admin_gets_all_food_items(self, client, db_session):
        """Admin receives a list of all food items."""
        _seed_admin_food(db_session, name="Admin Food A")
        _seed_admin_food(db_session, name="Admin Food B")
        headers = _admin_headers(db_session, email="get_food_admin@test.com")
        resp = client.get("/admin/food-database/", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        names = [item["name"] for item in resp.json()]
        assert "Admin Food A" in names
        assert "Admin Food B" in names

    def test_non_admin_returns_403(self, client, db_session):
        u = create_test_user(db_session, email="food_nonadmin@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.get("/admin/food-database/", headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/admin/food-database/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_response_has_required_fields(self, client, db_session):
        """Each food item has the required schema fields."""
        _seed_admin_food(db_session, name="Schema Food")
        headers = _admin_headers(db_session, email="food_schema_admin@test.com")
        resp = client.get("/admin/food-database/", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert len(data) >= 1
        required = {"food_id", "name", "source", "serving_size", "serving_unit",
                    "calories", "protein_g", "carb_g", "fat_g"}
        assert required.issubset(data[0].keys())


# ===========================================================================
# Endpoint: POST /admin/food-database/
# ===========================================================================

class TestCreateAdminFoodItem:
    """Tests for POST /admin/food-database/."""

    def test_create_food_item_success(self, client, db_session):
        """Admin creates a new food item (201)."""
        headers = _admin_headers(db_session, email="create_food_admin@test.com")
        resp = client.post("/admin/food-database/", json=_food_payload("New Food"), headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data["name"] == "New Food"
        assert data["source"] == "admin"
        assert data["food_id"] is not None

    def test_create_persists_to_db(self, client, db_session):
        """Created food item appears in the DB."""
        headers = _admin_headers(db_session, email="create_persist_admin@test.com")
        client.post("/admin/food-database/", json=_food_payload("Persisted Food"), headers=headers)
        row = db_session.exec(
            select(food_item).where(food_item.name == "Persisted Food")
        ).first()
        assert row is not None
        assert row.source == FoodSource.admin

    def test_non_admin_source_returns_400(self, client, db_session):
        """Source value other than 'admin' is rejected with 400."""
        headers = _admin_headers(db_session, email="bad_src_admin@test.com")
        resp = client.post(
            "/admin/food-database/",
            json=_food_payload(name="Wrong Source", source="ingredient"),
            headers=headers,
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_duplicate_barcode_returns_409(self, client, db_session):
        """Creating two items with the same barcode returns 409."""
        headers = _admin_headers(db_session, email="dup_barcode_admin@test.com")
        _seed_admin_food(db_session, barcode="1234567890001")
        resp = client.post(
            "/admin/food-database/",
            json=_food_payload(name="Dup Barcode", barcode="1234567890001"),
            headers=headers,
        )
        assert resp.status_code == status.HTTP_409_CONFLICT

    def test_empty_name_returns_422(self, client, db_session):
        """Empty name fails Pydantic validation (422)."""
        headers = _admin_headers(db_session, email="empty_name_admin@test.com")
        resp = client.post("/admin/food-database/", json=_food_payload(name=""), headers=headers)
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_non_admin_user_returns_403(self, client, db_session):
        u = create_test_user(db_session, email="create_food_nonadmin@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.post("/admin/food-database/", json=_food_payload(), headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ===========================================================================
# Endpoint: PATCH /admin/food-database/{food_id}
# ===========================================================================

class TestUpdateAdminFoodItem:
    """Tests for PATCH /admin/food-database/{food_id}."""

    def test_update_name_success(self, client, db_session):
        """Admin updates the name of an admin food item."""
        food = _seed_admin_food(db_session, name="Old Name")
        headers = _admin_headers(db_session, email="update_name_admin@test.com")
        resp = client.patch(
            f"/admin/food-database/{food.food_id}",
            json={"name": "Updated Name"},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["name"] == "Updated Name"

    def test_update_persists_to_db(self, client, db_session):
        """Updated calories value is reflected in the DB."""
        food = _seed_admin_food(db_session, name="Cal Update Food")
        headers = _admin_headers(db_session, email="update_cal_admin@test.com")
        client.patch(
            f"/admin/food-database/{food.food_id}",
            json={"calories": 999.0},
            headers=headers,
        )
        db_session.refresh(food)
        assert food.calories == 999.0

    def test_food_not_found_returns_404(self, client, db_session):
        headers = _admin_headers(db_session, email="update_404_admin@test.com")
        resp = client.patch(
            "/admin/food-database/999999",
            json={"name": "Ghost Food"},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_non_admin_source_item_returns_400(self, client, db_session):
        """Editing a food item not sourced as 'admin' returns 400."""
        food = _seed_admin_food(db_session, name="Ingredient Item", source=FoodSource.ingredient)
        headers = _admin_headers(db_session, email="update_src_admin@test.com")
        resp = client.patch(
            f"/admin/food-database/{food.food_id}",
            json={"name": "Renamed"},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_empty_payload_returns_400(self, client, db_session):
        """Sending an empty JSON body returns 400."""
        food = _seed_admin_food(db_session, name="Empty Update Food")
        headers = _admin_headers(db_session, email="update_empty_admin@test.com")
        resp = client.patch(
            f"/admin/food-database/{food.food_id}",
            json={},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_duplicate_barcode_on_update_returns_409(self, client, db_session):
        """Setting barcode to one already used by another item returns 409."""
        _seed_admin_food(db_session, barcode="9999999000001", name="Barcode Owner")
        target = _seed_admin_food(db_session, name="Barcode Changer")
        headers = _admin_headers(db_session, email="update_dupbar_admin@test.com")
        resp = client.patch(
            f"/admin/food-database/{target.food_id}",
            json={"barcode": "9999999000001"},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_409_CONFLICT

    def test_non_admin_user_returns_403(self, client, db_session):
        food = _seed_admin_food(db_session, name="PATCH 403 Food")
        u = create_test_user(db_session, email="update_nonadmin@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.patch(
            f"/admin/food-database/{food.food_id}",
            json={"name": "Sneaky Update"},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ===========================================================================
# Endpoint: DELETE /admin/food-database/{food_id}
# ===========================================================================

class TestDeleteAdminFoodItem:
    """Tests for DELETE /admin/food-database/{food_id}."""

    def test_delete_admin_food_success(self, client, db_session):
        """Admin deletes an admin-sourced food item (204)."""
        food = _seed_admin_food(db_session, name="Delete Me Food")
        headers = _admin_headers(db_session, email="delete_food_admin@test.com")
        resp = client.delete(f"/admin/food-database/{food.food_id}", headers=headers)
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_removes_row_from_db(self, client, db_session):
        """Deleted item no longer exists in the DB."""
        food = _seed_admin_food(db_session, name="Delete DB Check")
        food_id = food.food_id
        headers = _admin_headers(db_session, email="delete_db_admin@test.com")
        client.delete(f"/admin/food-database/{food_id}", headers=headers)
        remaining = db_session.exec(
            select(food_item).where(food_item.food_id == food_id)
        ).first()
        assert remaining is None

    def test_food_not_found_returns_404(self, client, db_session):
        headers = _admin_headers(db_session, email="delete_404_admin@test.com")
        resp = client.delete("/admin/food-database/999999", headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_non_admin_source_returns_400(self, client, db_session):
        """Attempting to delete a non-admin food item returns 400."""
        food = _seed_admin_food(db_session, name="Product Food", source=FoodSource.product)
        headers = _admin_headers(db_session, email="delete_src_admin@test.com")
        resp = client.delete(f"/admin/food-database/{food.food_id}", headers=headers)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_non_admin_user_returns_403(self, client, db_session):
        food = _seed_admin_food(db_session, name="DELETE 403 Food")
        u = create_test_user(db_session, email="delete_nonadmin@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.delete(f"/admin/food-database/{food.food_id}", headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_returns_401(self, client, db_session):
        food = _seed_admin_food(db_session, name="Unauth Delete Food")
        resp = client.delete(f"/admin/food-database/{food.food_id}")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
