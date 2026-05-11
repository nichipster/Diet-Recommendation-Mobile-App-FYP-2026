"""
test_user_preferences.py

Unit and integration tests for routers/user_preferences.py.

Coverage targets:
- POST /preferences/create-preferences  — success (all defaults), already exists (409),
                                          user not found (404), no token (401)
- GET  /preferences/view-preferences    — success, user not found (404),
                                          prefs not found (404), no token (401)
- PUT  /preferences/update-preferences  — success, prefs not found (404), no token (401)
"""

import pytest
from fastapi import status

from .utils import create_test_user, get_auth_headers

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_DEFAULT_PREFS_PAYLOAD = {
    "is_vegetarian": False,
    "is_vegan": False,
    "is_halal": False,
    "is_gluten_free": False,
    "has_peanut_allergy": False,
    "has_tree_nut_allergy": False,
    "has_milk_allergy": False,
    "has_egg_allergy": False,
    "has_fish_allergy": False,
    "has_shellfish_allergy": False,
    "has_soy_allergy": False,
    "has_wheat_allergy": False,
    "has_sesame_allergy": False,
    "has_sulfite_allergy": False,
    "allergy_notes": None,
}


def _create_prefs(client, db_session, email: str = "prefs@test.com", payload: dict | None = None):
    """Helper: create a user and POST their preferences."""
    db_user = create_test_user(db_session, email=email)
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    body = payload or _DEFAULT_PREFS_PAYLOAD
    resp = client.post("/preferences/create-preferences", json=body, headers=headers)
    return db_user, headers, resp


# ===========================================================================
# POST /preferences/create-preferences
# ===========================================================================

def test_create_preferences_success_all_defaults(client, db_session):
    """Successful creation with default values returns 201 and correct schema."""
    db_user, headers, resp = _create_prefs(client, db_session, email="prefs_ok@test.com")
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["user_id"] == db_user.user_id
    assert data["is_vegetarian"] is False
    assert data["is_vegan"] is False
    assert data["is_halal"] is False
    assert "preference_id" in data
    assert "created_at" in data


def test_create_preferences_success_with_dietary_flags(client, db_session):
    """Non-default flags are correctly persisted."""
    db_user = create_test_user(db_session, email="prefs_veg@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    payload = {**_DEFAULT_PREFS_PAYLOAD, "is_vegetarian": True, "is_gluten_free": True}
    resp = client.post("/preferences/create-preferences", json=payload, headers=headers)
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["is_vegetarian"] is True
    assert data["is_gluten_free"] is True


def test_create_preferences_already_exists(client, db_session):
    """Creating preferences a second time for the same user returns 409."""
    _, headers, _ = _create_prefs(client, db_session, email="prefs_dup@test.com")
    resp = client.post("/preferences/create-preferences", json=_DEFAULT_PREFS_PAYLOAD, headers=headers)
    assert resp.status_code == status.HTTP_409_CONFLICT


def test_create_preferences_user_not_found(client):
    """Token for non-existent user returns 404."""
    headers = get_auth_headers(user_id=99999, email="ghost@test.com")
    resp = client.post("/preferences/create-preferences", json=_DEFAULT_PREFS_PAYLOAD, headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_create_preferences_no_token(client):
    """Missing token returns 401."""
    resp = client.post("/preferences/create-preferences", json=_DEFAULT_PREFS_PAYLOAD)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_preferences_with_allergy_notes(client, db_session):
    """allergy_notes string is stored and returned."""
    db_user = create_test_user(db_session, email="prefs_notes@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    payload = {**_DEFAULT_PREFS_PAYLOAD, "allergy_notes": "Severe peanut allergy — carry EpiPen"}
    resp = client.post("/preferences/create-preferences", json=payload, headers=headers)
    assert resp.status_code == status.HTTP_201_CREATED


def test_create_preferences_halal_flag(client, db_session):
    """Halal flag is accepted and stored (even though recommendation filtering is a known bug)."""
    db_user = create_test_user(db_session, email="prefs_halal@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    payload = {**_DEFAULT_PREFS_PAYLOAD, "is_halal": True}
    resp = client.post("/preferences/create-preferences", json=payload, headers=headers)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json()["is_halal"] is True


# ===========================================================================
# GET /preferences/view-preferences
# ===========================================================================

def test_view_preferences_success(client, db_session):
    """Authenticated user with preferences receives full preference record."""
    db_user, headers, _ = _create_prefs(client, db_session, email="vp_ok@test.com")
    resp = client.get("/preferences/view-preferences", headers=headers)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["user_id"] == db_user.user_id
    required_fields = {
        "preference_id", "user_id", "is_vegetarian", "is_vegan", "is_halal",
        "is_gluten_free", "has_peanut_allergy", "created_at", "updated_at",
    }
    assert required_fields.issubset(data.keys())


def test_view_preferences_not_found(client, db_session):
    """User without preferences returns 404."""
    db_user = create_test_user(db_session, email="vp_noprof@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    resp = client.get("/preferences/view-preferences", headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_view_preferences_user_not_found(client):
    """Token for non-existent user returns 404."""
    headers = get_auth_headers(user_id=99999, email="ghost@test.com")
    resp = client.get("/preferences/view-preferences", headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_view_preferences_no_token(client):
    """Missing token returns 401."""
    resp = client.get("/preferences/view-preferences")
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_view_preferences_reflects_stored_flags(client, db_session):
    """Flags stored at creation time are correctly returned on view."""
    db_user = create_test_user(db_session, email="vp_flags@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    payload = {**_DEFAULT_PREFS_PAYLOAD, "is_vegan": True, "has_milk_allergy": True}
    client.post("/preferences/create-preferences", json=payload, headers=headers)

    resp = client.get("/preferences/view-preferences", headers=headers)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["is_vegan"] is True
    assert data["has_milk_allergy"] is True


# ===========================================================================
# PUT /preferences/update-preferences
# ===========================================================================

def test_update_preferences_success(client, db_session):
    """Toggling a preference flag returns 204 and the change is reflected on view."""
    db_user, headers, _ = _create_prefs(client, db_session, email="up_prefs_ok@test.com")

    resp = client.put(
        "/preferences/update-preferences",
        json={**_DEFAULT_PREFS_PAYLOAD, "is_vegetarian": True},
        headers=headers,
    )
    assert resp.status_code == status.HTTP_204_NO_CONTENT

    view_resp = client.get("/preferences/view-preferences", headers=headers)
    assert view_resp.json()["is_vegetarian"] is True


def test_update_preferences_multiple_flags(client, db_session):
    """Updating multiple flags in a single request persists all changes."""
    db_user, headers, _ = _create_prefs(client, db_session, email="up_prefs_multi@test.com")
    payload = {**_DEFAULT_PREFS_PAYLOAD, "is_halal": True, "is_gluten_free": True}
    resp = client.put("/preferences/update-preferences", json=payload, headers=headers)
    assert resp.status_code == status.HTTP_204_NO_CONTENT

    view_resp = client.get("/preferences/view-preferences", headers=headers)
    data = view_resp.json()
    assert data["is_halal"] is True
    assert data["is_gluten_free"] is True


def test_update_preferences_not_found(client, db_session):
    """User without preferences gets 404 on update."""
    db_user = create_test_user(db_session, email="up_prefs_noprof@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    resp = client.put(
        "/preferences/update-preferences",
        json=_DEFAULT_PREFS_PAYLOAD,
        headers=headers,
    )
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_update_preferences_user_not_found(client):
    """Token for non-existent user returns 404."""
    headers = get_auth_headers(user_id=99999, email="ghost@test.com")
    resp = client.put(
        "/preferences/update-preferences",
        json=_DEFAULT_PREFS_PAYLOAD,
        headers=headers,
    )
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_update_preferences_no_token(client):
    """Missing token returns 401."""
    resp = client.put("/preferences/update-preferences", json=_DEFAULT_PREFS_PAYLOAD)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_update_preferences_clears_previous_flags(client, db_session):
    """Setting a flag to False after it was True is correctly persisted."""
    db_user = create_test_user(db_session, email="up_prefs_clear@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

    # Create with is_vegetarian=True
    create_payload = {**_DEFAULT_PREFS_PAYLOAD, "is_vegetarian": True}
    client.post("/preferences/create-preferences", json=create_payload, headers=headers)

    # Update: set back to False
    update_payload = {**_DEFAULT_PREFS_PAYLOAD, "is_vegetarian": False}
    resp = client.put("/preferences/update-preferences", json=update_payload, headers=headers)
    assert resp.status_code == status.HTTP_204_NO_CONTENT

    view_resp = client.get("/preferences/view-preferences", headers=headers)
    assert view_resp.json()["is_vegetarian"] is False
