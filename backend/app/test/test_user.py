"""
test_user.py

Unit and integration tests for routers/user.py.

Coverage targets:
- GET  /user/me          — authenticated success, no token (401), user not in DB (404)
- PUT  /user/change-info — success (partial), no token, user not found, email normalised
"""

import pytest
from fastapi import status

from .utils import create_test_user, get_auth_headers


# ===========================================================================
# GET /user/me
# ===========================================================================

def test_get_current_user_success(client, db_session):
    """Authenticated user receives their own info with correct fields."""
    db_user = create_test_user(db_session, email="me@test.com")
    response = client.get(
        "/user/me",
        headers=get_auth_headers(user_id=db_user.user_id, email=db_user.email),
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["user_id"] == db_user.user_id
    assert data["email"] == db_user.email
    assert data["first_name"] == db_user.first_name
    assert data["last_name"] == db_user.last_name
    assert data["role"] == db_user.role


def test_get_current_user_no_token(client):
    """Missing authorization token returns 401."""
    response = client.get("/user/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user_deleted_mid_session(client):
    """Token referencing a non-existent user_id returns 404."""
    # user_id=99999 does not exist in the test DB
    headers = get_auth_headers(user_id=99999, email="ghost@test.com")
    response = client.get("/user/me", headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_current_user_response_excludes_sensitive_fields(client, db_session):
    """Response must NOT expose hashed_password or internal secrets."""
    db_user = create_test_user(db_session, email="safe@test.com")
    response = client.get(
        "/user/me",
        headers=get_auth_headers(user_id=db_user.user_id, email=db_user.email),
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "hashed_password" not in data
    assert "verification_code" not in data


# ===========================================================================
# PUT /user/change-info
# ===========================================================================

def test_change_info_update_first_name(client, db_session):
    """Updating first_name returns 204 and persists the change."""
    db_user = create_test_user(db_session, email="ci_fn@test.com")
    response = client.put(
        "/user/change-info",
        json={"first_name": "UpdatedName"},
        headers=get_auth_headers(user_id=db_user.user_id, email=db_user.email),
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT
    db_session.refresh(db_user)
    assert db_user.first_name == "UpdatedName"


def test_change_info_update_email(client, db_session):
    """Updating email persists correctly."""
    db_user = create_test_user(db_session, email="ci_email@test.com")
    response = client.put(
        "/user/change-info",
        json={"email": "newemail@test.com"},
        headers=get_auth_headers(user_id=db_user.user_id, email=db_user.email),
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT
    db_session.refresh(db_user)
    assert db_user.email == "newemail@test.com"


def test_change_info_partial_update_does_not_overwrite_other_fields(client, db_session):
    """Updating only last_name leaves first_name unchanged."""
    db_user = create_test_user(
        db_session,
        email="ci_partial@test.com",
        first_name="Original",
        last_name="Last",
    )
    response = client.put(
        "/user/change-info",
        json={"last_name": "NewLast"},
        headers=get_auth_headers(user_id=db_user.user_id, email=db_user.email),
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT
    db_session.refresh(db_user)
    assert db_user.first_name == "Original"
    assert db_user.last_name == "NewLast"


def test_change_info_empty_body(client, db_session):
    """Empty request body is accepted (no-op update) and returns 204."""
    db_user = create_test_user(db_session, email="ci_empty@test.com")
    response = client.put(
        "/user/change-info",
        json={},
        headers=get_auth_headers(user_id=db_user.user_id, email=db_user.email),
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT


def test_change_info_no_token(client):
    """Missing token returns 401."""
    response = client.put("/user/change-info", json={"first_name": "NoAuth"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_change_info_user_not_found(client):
    """Token for non-existent user returns 404."""
    headers = get_auth_headers(user_id=99999, email="ghost@test.com")
    response = client.put(
        "/user/change-info",
        json={"first_name": "Ghost"},
        headers=headers,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
