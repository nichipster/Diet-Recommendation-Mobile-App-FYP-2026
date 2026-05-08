"""
test_notifications.py

Unit and integration tests for routers/notifications.py.

Coverage targets:
  - POST /notifications/register-token    new token, reassign existing token, unauthenticated
  - POST /admin/notifications/send        non-admin (403), all/premium/freemium segments,
                                          no recipients → count 0, Expo call mocked
  - GET  /admin/notifications/history     admin-only, populated, empty
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi import status
from sqlmodel import select

from app.models import (
    push_token,
    notification_history,
    NotificationSegment,
    UserRole,
)
from .utils import create_test_user, get_auth_headers


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _admin_headers(db_session, email: str = "notif_admin@test.com") -> dict:
    admin = create_test_user(db_session, email=email, role=UserRole.admin)
    return get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)


def _send_payload(segment: str = "all") -> dict:
    return {
        "title": "Test Notification",
        "message": "This is a test message.",
        "segment": segment,
    }


def _seed_push_token(db_session, user_id: int, token: str) -> push_token:
    """Seeds a push token directly."""
    pt = push_token(user_id=user_id, token=token, is_active=True)
    db_session.add(pt)
    db_session.commit()
    db_session.refresh(pt)
    return pt


# ===========================================================================
# Endpoint: POST /notifications/register-token
# ===========================================================================

class TestRegisterPushToken:
    """Integration tests for POST /notifications/register-token."""

    def test_register_new_token_success(self, client, db_session):
        """Authenticated user registers a new push token (200)."""
        u = create_test_user(db_session, email="reg_token_ok@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.post(
            "/notifications/register-token",
            json={"token": "ExponentPushToken[new_abc]"},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "registered" in resp.json()["message"].lower()

    def test_register_token_persists_to_db(self, client, db_session):
        """Registering a token writes a push_token row with is_active=True."""
        u = create_test_user(db_session, email="reg_token_db@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        client.post(
            "/notifications/register-token",
            json={"token": "ExponentPushToken[persist_tok]"},
            headers=headers,
        )
        row = db_session.exec(
            select(push_token).where(push_token.user_id == u.user_id)
        ).first()
        assert row is not None
        assert row.token == "ExponentPushToken[persist_tok]"
        assert row.is_active is True

    def test_existing_token_reassigned_to_requesting_user(self, client, db_session):
        """Token belonging to another user is reassigned to the requesting user."""
        owner_a = create_test_user(db_session, email="tok_owner_a@test.com")
        owner_b = create_test_user(db_session, email="tok_owner_b@test.com")
        shared = "ExponentPushToken[shared_xyz]"
        _seed_push_token(db_session, user_id=owner_a.user_id, token=shared)

        headers_b = get_auth_headers(user_id=owner_b.user_id, email=owner_b.email)
        resp = client.post(
            "/notifications/register-token",
            json={"token": shared},
            headers=headers_b,
        )
        assert resp.status_code == status.HTTP_200_OK
        row = db_session.exec(
            select(push_token).where(push_token.token == shared)
        ).first()
        db_session.refresh(row)
        assert row.user_id == owner_b.user_id

    def test_unauthenticated_returns_401(self, client):
        """Unauthenticated registration returns 401."""
        resp = client.post(
            "/notifications/register-token",
            json={"token": "ExponentPushToken[anon]"},
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# Endpoint: POST /admin/notifications/send
# ===========================================================================

class TestSendNotification:
    """Integration tests for POST /admin/notifications/send."""

    def test_non_admin_returns_403(self, client, db_session):
        """Non-admin users cannot send notifications."""
        u = create_test_user(db_session, email="send_nonadmin@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.post("/admin/notifications/send", json=_send_payload(), headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/admin/notifications/send", json=_send_payload())
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_no_recipients_returns_zero_count(self, client, db_session):
        """Sending to a segment with no matching users returns recipient_count=0."""
        headers = _admin_headers(db_session, email="send_empty@test.com")
        resp = client.post("/admin/notifications/send", json=_send_payload("premium"), headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["recipient_count"] == 0

    def test_no_recipients_still_writes_history(self, client, db_session):
        """Zero-recipient send still writes a notification_history row."""
        headers = _admin_headers(db_session, email="send_hist_empty@test.com")
        before = len(db_session.exec(select(notification_history)).all())
        client.post("/admin/notifications/send", json=_send_payload("premium"), headers=headers)
        after = len(db_session.exec(select(notification_history)).all())
        assert after > before

    @patch("app.routers.notifications.send_expo_push_notifications")
    def test_all_segment_calls_expo_and_records_history(self, mock_expo, client, db_session):
        """Admin sends 'all' segment → Expo is called, history row persisted."""
        mock_expo.return_value = MagicMock()
        u = create_test_user(db_session, email="send_all_user@test.com", role=UserRole.freemium)
        _seed_push_token(db_session, user_id=u.user_id, token="ExponentPushToken[all_tok]")
        headers = _admin_headers(db_session, email="send_all_admin@test.com")
        resp = client.post("/admin/notifications/send", json=_send_payload("all"), headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["recipient_count"] >= 1
        mock_expo.assert_called_once()

    @patch("app.routers.notifications.send_expo_push_notifications")
    def test_premium_segment_only_targets_premium_users(self, mock_expo, client, db_session):
        """Premium segment passes only premium-user tokens to Expo."""
        mock_expo.return_value = MagicMock()
        freemium = create_test_user(db_session, email="seg_free@test.com", role=UserRole.freemium)
        premium = create_test_user(db_session, email="seg_prem@test.com", role=UserRole.premium)
        _seed_push_token(db_session, user_id=premium.user_id, token="ExponentPushToken[prem_tok]")
        _seed_push_token(db_session, user_id=freemium.user_id, token="ExponentPushToken[free_tok]")
        headers = _admin_headers(db_session, email="seg_admin@test.com")
        client.post("/admin/notifications/send", json=_send_payload("premium"), headers=headers)
        call_args = mock_expo.call_args
        tokens = call_args.kwargs.get("tokens") or call_args.args[0]
        assert "ExponentPushToken[prem_tok]" in tokens
        assert "ExponentPushToken[free_tok]" not in tokens

    @patch("app.routers.notifications.send_expo_push_notifications")
    def test_history_contains_correct_fields(self, mock_expo, client, db_session):
        """History row stores correct title, message, and segment."""
        mock_expo.return_value = MagicMock()
        u = create_test_user(db_session, email="hist_check@test.com", role=UserRole.freemium)
        _seed_push_token(db_session, user_id=u.user_id, token="ExponentPushToken[hist_tok]")
        headers = _admin_headers(db_session, email="hist_admin@test.com")
        client.post(
            "/admin/notifications/send",
            json={"title": "Hello", "message": "World", "segment": "all"},
            headers=headers,
        )
        row = db_session.exec(
            select(notification_history).order_by(notification_history.sent_at.desc())
        ).first()
        assert row.title == "Hello"
        assert row.message == "World"
        assert row.segment == NotificationSegment.all


# ===========================================================================
# Endpoint: GET /admin/notifications/history
# ===========================================================================

class TestGetNotificationHistory:
    """Integration tests for GET /admin/notifications/history."""

    def _seed_history(self, db_session, admin_user_id: int, count: int = 1) -> None:
        for i in range(count):
            row = notification_history(
                title=f"Notification {i}",
                message=f"Body {i}",
                segment=NotificationSegment.all,
                recipient_count=0,
                created_by_user_id=admin_user_id,
            )
            db_session.add(row)
        db_session.commit()

    def test_admin_gets_history_list(self, client, db_session):
        """Admin receives the notification history."""
        admin = create_test_user(db_session, email="hist_admin2@test.com", role=UserRole.admin)
        self._seed_history(db_session, admin_user_id=admin.user_id, count=2)
        headers = get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)
        resp = client.get("/admin/notifications/history", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.json()) >= 2

    def test_empty_history_returns_empty_list(self, client, db_session):
        """Admin with no notifications sees an empty list."""
        admin = create_test_user(db_session, email="empty_hist2@test.com", role=UserRole.admin)
        headers = get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)
        resp = client.get("/admin/notifications/history", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.json(), list)

    def test_non_admin_returns_403(self, client, db_session):
        """Non-admin cannot access notification history."""
        u = create_test_user(db_session, email="hist_nonadmin2@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.get("/admin/notifications/history", headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/admin/notifications/history")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_history_item_has_required_fields(self, client, db_session):
        """Each history item includes required schema fields."""
        admin = create_test_user(db_session, email="hist_fields2@test.com", role=UserRole.admin)
        self._seed_history(db_session, admin_user_id=admin.user_id)
        headers = get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)
        resp = client.get("/admin/notifications/history", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert len(data) >= 1
        required = {"id", "title", "message", "segment", "sent_at", "recipient_count"}
        assert required.issubset(data[0].keys())
