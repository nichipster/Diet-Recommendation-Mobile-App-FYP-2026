"""
test_account.py

Unit and integration tests for routers/account.py.

Coverage targets:
  - DELETE /account/me    success (user + profile + prefs deleted),
                          success with no profile/prefs,
                          unauthenticated (401),
                          nonexistent user (404)
"""

import pytest
from fastapi import status
from sqlmodel import select
from datetime import date

from app.models import user, user_profile, user_preferences, Gender, ActivityLevel
from .utils import create_test_user, get_auth_headers


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seed_profile(db_session, user_id: int) -> user_profile:
    """Seeds a minimal user_profile."""
    profile = user_profile(
        user_id=user_id,
        gender=Gender.male,
        dob=date(1995, 6, 15),
        height_cm=175.0,
        weight_kg=70.0,
        activity_level=ActivityLevel.sedentary,
        tdee=2000,
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)
    return profile


def _seed_preferences(db_session, user_id: int) -> user_preferences:
    """Seeds a minimal user_preferences row."""
    prefs = user_preferences(user_id=user_id, is_vegetarian=True)
    db_session.add(prefs)
    db_session.commit()
    db_session.refresh(prefs)
    return prefs


# ===========================================================================
# Endpoint: DELETE /account/me
# ===========================================================================

class TestDeleteMyAccount:
    """Integration tests for DELETE /account/me."""

    def test_delete_account_with_profile_and_preferences(self, client, db_session):
        """User with profile and prefs deletes account → 204, user row gone."""
        u = create_test_user(db_session, email="delete_full@test.com")
        _seed_profile(db_session, user_id=u.user_id)
        _seed_preferences(db_session, user_id=u.user_id)
        headers = get_auth_headers(user_id=u.user_id, email=u.email)

        resp = client.delete("/account/me", headers=headers)
        assert resp.status_code == status.HTTP_204_NO_CONTENT

        remaining = db_session.exec(
            select(user).where(user.user_id == u.user_id)
        ).first()
        assert remaining is None

    def test_delete_removes_profile_row(self, client, db_session):
        """After deletion the user_profile row is gone from the DB."""
        u = create_test_user(db_session, email="delete_profile_chk@test.com")
        _seed_profile(db_session, user_id=u.user_id)
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        client.delete("/account/me", headers=headers)

        profile = db_session.exec(
            select(user_profile).where(user_profile.user_id == u.user_id)
        ).first()
        assert profile is None

    def test_delete_removes_preferences_row(self, client, db_session):
        """After deletion the user_preferences row is gone."""
        u = create_test_user(db_session, email="delete_prefs_chk@test.com")
        _seed_preferences(db_session, user_id=u.user_id)
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        client.delete("/account/me", headers=headers)

        prefs = db_session.exec(
            select(user_preferences).where(user_preferences.user_id == u.user_id)
        ).first()
        assert prefs is None

    def test_delete_account_without_profile_or_preferences(self, client, db_session):
        """User with no profile/prefs still gets 204 on deletion."""
        u = create_test_user(db_session, email="delete_bare@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.delete("/account/me", headers=headers)
        assert resp.status_code == status.HTTP_204_NO_CONTENT

        remaining = db_session.exec(
            select(user).where(user.user_id == u.user_id)
        ).first()
        assert remaining is None

    def test_unauthenticated_returns_401(self, client):
        """Unauthenticated DELETE /account/me returns 401."""
        resp = client.delete("/account/me")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_nonexistent_user_returns_404(self, client):
        """JWT for a user_id that doesn't exist in the DB returns 404."""
        headers = get_auth_headers(user_id=999999, email="ghost@test.com")
        resp = client.delete("/account/me", headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_returns_no_body(self, client, db_session):
        """204 response has an empty body."""
        u = create_test_user(db_session, email="delete_nobody@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.delete("/account/me", headers=headers)
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert resp.content == b""
