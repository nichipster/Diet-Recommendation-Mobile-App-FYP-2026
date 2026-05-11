"""
test_admin_extra.py

Supplementary tests for admin router endpoints not yet covered to ≥80%:

  admin.py
    - POST /admin/notifications  success broadcast, single recipient, missing recipient_user_id

  admin_users.py
    - GET  /admin/users           admin success, non-admin 403, pagination, audit log
    - POST /admin/users           create freemium, create nutritionist, duplicate email 409
    - PUT  /admin/users/{id}/unsuspend  success, not-suspended 409, not found 404, non-admin 403
"""

import pytest
from fastapi import status
from sqlmodel import select

from app.models import audit_log, AuditLogType, UserRole, user
from .utils import create_test_user, get_auth_headers


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _admin_headers(db_session, email: str = "extra_admin@test.com") -> dict:
    admin = create_test_user(db_session, email=email, role=UserRole.admin)
    return get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)


def _count_logs(db_session, action: str) -> int:
    return len(db_session.exec(
        select(audit_log).where(audit_log.action == action)
    ).all())


# ===========================================================================
# POST /admin/notifications  (routers/admin.py)
# ===========================================================================

class TestAdminNotifications:
    """Tests for the admin push notification dispatch endpoint in admin.py."""

    def test_broadcast_notification_succeeds(self, client, db_session):
        """Broadcast notification (broadcast=true) returns 200 with status=dispatched."""
        headers = _admin_headers(db_session, "notif_bc_admin@test.com")
        resp = client.post(
            "/admin/notifications",
            json={"title": "Broadcast", "body": "Hello everyone", "broadcast": True},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["status"] == "dispatched"
        assert data["title"] == "Broadcast"

    def test_broadcast_notification_logs_system_event(self, client, db_session):
        """Broadcast notification must write a system-type audit log."""
        headers = _admin_headers(db_session, "notif_log_admin@test.com")
        before = _count_logs(db_session, "push_notification_sent")
        client.post(
            "/admin/notifications",
            json={"title": "Log check", "body": "Testing log", "broadcast": True},
            headers=headers,
        )
        after = _count_logs(db_session, "push_notification_sent")
        assert after == before + 1

        entry = db_session.exec(
            select(audit_log)
            .where(audit_log.action == "push_notification_sent")
            .order_by(audit_log.timestamp.desc())
        ).first()
        assert entry.type == AuditLogType.system

    def test_single_recipient_notification_succeeds(self, client, db_session):
        """Targeted notification to a specific user_id returns 200."""
        target = create_test_user(db_session, email="notif_target@test.com")
        headers = _admin_headers(db_session, "notif_single_admin@test.com")
        resp = client.post(
            "/admin/notifications",
            json={
                "title": "Personal Message",
                "body": "Just for you",
                "broadcast": False,
                "recipient_user_id": target.user_id,
            },
            headers=headers,
        )
        assert resp.status_code == status.HTTP_200_OK
        assert str(target.user_id) in resp.json()["target"]

    def test_non_broadcast_without_recipient_returns_400(self, client, db_session):
        """broadcast=false with no recipient_user_id must return 400."""
        headers = _admin_headers(db_session, "notif_norecip_admin@test.com")
        resp = client.post(
            "/admin/notifications",
            json={"title": "Oops", "body": "No target", "broadcast": False},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_returns_401(self, client):
        resp = client.post(
            "/admin/notifications",
            json={"title": "Hi", "body": "Bye", "broadcast": True},
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_admin_returns_403(self, client, db_session):
        u = create_test_user(db_session, email="notif_nonadmin@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.post(
            "/admin/notifications",
            json={"title": "Hi", "body": "Bye", "broadcast": True},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_empty_title_returns_422(self, client, db_session):
        """Title with min_length=1 means empty string should fail validation."""
        headers = _admin_headers(db_session, "notif_empty_admin@test.com")
        resp = client.post(
            "/admin/notifications",
            json={"title": "", "body": "Some message", "broadcast": True},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ===========================================================================
# GET /admin/users  (routers/admin_users.py)
# ===========================================================================

class TestListAllUsers:
    """Tests for GET /admin/users."""

    def test_admin_receives_user_list(self, client, db_session):
        """Admin should receive a 200 with a list of users."""
        headers = _admin_headers(db_session, "list_admin@test.com")
        resp = client.get("/admin/users", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.json(), list)

    def test_user_list_has_required_schema_fields(self, client, db_session):
        """Each user object must include the AdminUserResponse fields."""
        create_test_user(db_session, email="schema_check_u@test.com")
        headers = _admin_headers(db_session, "schema_list_admin@test.com")
        resp = client.get("/admin/users", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        required = {"user_id", "first_name", "last_name", "email", "role", "suspended", "created_at"}
        for u in resp.json():
            assert required.issubset(u.keys())

    def test_non_admin_returns_403(self, client, db_session):
        u = create_test_user(db_session, email="list_nonadmin@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.get("/admin/users", headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/admin/users")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_creates_bulk_user_access_log(self, client, db_session):
        """Accessing user list must write a bulk_user_access warning log."""
        headers = _admin_headers(db_session, "list_log_admin@test.com")
        before = _count_logs(db_session, "bulk_user_access")
        client.get("/admin/users", headers=headers)
        after = _count_logs(db_session, "bulk_user_access")
        assert after == before + 1

    def test_pagination_limit_reduces_results(self, client, db_session):
        """limit=1 should return at most one user record."""
        headers = _admin_headers(db_session, "page_list_admin@test.com")
        resp = client.get("/admin/users?limit=1", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.json()) <= 1

    def test_offset_skips_records(self, client, db_session):
        """offset=9999 should return fewer records than offset=0."""
        headers = _admin_headers(db_session, "offset_admin@test.com")
        resp_zero = client.get("/admin/users?offset=0&limit=100", headers=headers)
        resp_high = client.get("/admin/users?offset=9999&limit=100", headers=headers)
        assert len(resp_zero.json()) >= len(resp_high.json())


# ===========================================================================
# POST /admin/users  (routers/admin_users.py)
# ===========================================================================

class TestAdminCreateUser:
    """Tests for POST /admin/users."""

    def _create_payload(self, email: str, role: str = "freemium") -> dict:
        return {
            "first_name": "New",
            "last_name": "User",
            "email": email,
            "password": "SecurePass123",
            "role": role,
        }

    def test_admin_creates_freemium_user(self, client, db_session):
        """Admin can create a new freemium user; response is 201 with correct role."""
        headers = _admin_headers(db_session, "create_admin@test.com")
        resp = client.post(
            "/admin/users",
            json=self._create_payload("new_freemium@test.com", role="freemium"),
            headers=headers,
        )
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data["email"] == "new_freemium@test.com"
        assert data["role"] == "freemium"

    def test_admin_creates_nutritionist_user(self, client, db_session):
        """Admin can create a nutritionist-role user."""
        headers = _admin_headers(db_session, "create_nutr_admin@test.com")
        resp = client.post(
            "/admin/users",
            json=self._create_payload("new_nutritionist@test.com", role="nutritionist"),
            headers=headers,
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.json()["role"] == "nutritionist"

    def test_duplicate_email_returns_409(self, client, db_session):
        """Creating a user with a duplicate email must return 409 Conflict."""
        headers = _admin_headers(db_session, "dup_admin@test.com")
        payload = self._create_payload("dup_user@test.com", role="freemium")
        client.post("/admin/users", json=payload, headers=headers)
        resp = client.post("/admin/users", json=payload, headers=headers)
        assert resp.status_code == status.HTTP_409_CONFLICT

    def test_create_writes_user_created_audit_log(self, client, db_session):
        """Creating a user must write a user_created audit log entry."""
        headers = _admin_headers(db_session, "audit_create_admin@test.com")
        before = _count_logs(db_session, "user_created")
        client.post(
            "/admin/users",
            json=self._create_payload("log_target@test.com"),
            headers=headers,
        )
        after = _count_logs(db_session, "user_created")
        assert after == before + 1

    def test_non_admin_returns_403(self, client, db_session):
        u = create_test_user(db_session, email="create_nonadmin@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.post(
            "/admin/users",
            json=self._create_payload("blocked@test.com"),
            headers=headers,
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/admin/users", json=self._create_payload("anon@test.com"))
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_missing_required_fields_returns_422(self, client, db_session):
        """Request body missing required fields should return 422."""
        headers = _admin_headers(db_session, "missing_admin@test.com")
        resp = client.post("/admin/users", json={"email": "only@email.com"}, headers=headers)
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ===========================================================================
# PUT /admin/users/{id}/unsuspend  (routers/admin_users.py)
# ===========================================================================

class TestUnsuspendUser:
    """Tests for PUT /admin/users/{id}/unsuspend."""

    def test_unsuspend_suspended_user_succeeds(self, client, db_session):
        """Unsuspending a suspended user should return 204 and clear suspended flag."""
        target = create_test_user(db_session, email="unsus_target@test.com")
        headers = _admin_headers(db_session, "unsus_admin@test.com")

        # First suspend
        client.put(f"/admin/users/{target.user_id}/suspend", headers=headers)

        # Then unsuspend
        resp = client.put(f"/admin/users/{target.user_id}/unsuspend", headers=headers)
        assert resp.status_code == status.HTTP_204_NO_CONTENT

        # Verify in DB
        db_session.refresh(target)
        assert target.suspended is False

    def test_unsuspend_writes_audit_log(self, client, db_session):
        """Unsuspending a user must write a user_unsuspended audit log."""
        target = create_test_user(db_session, email="unsus_log_target@test.com")
        headers = _admin_headers(db_session, "unsus_log_admin@test.com")

        client.put(f"/admin/users/{target.user_id}/suspend", headers=headers)
        before = _count_logs(db_session, "user_unsuspended")
        client.put(f"/admin/users/{target.user_id}/unsuspend", headers=headers)
        after = _count_logs(db_session, "user_unsuspended")
        assert after == before + 1

    def test_unsuspend_non_suspended_user_returns_409(self, client, db_session):
        """Unsuspending an active user should return 409 Conflict."""
        target = create_test_user(db_session, email="notsus_target@test.com")
        headers = _admin_headers(db_session, "notsus_admin@test.com")

        resp = client.put(f"/admin/users/{target.user_id}/unsuspend", headers=headers)
        assert resp.status_code == status.HTTP_409_CONFLICT

    def test_unsuspend_nonexistent_user_returns_404(self, client, db_session):
        """Unsuspending a user that does not exist should return 404."""
        headers = _admin_headers(db_session, "unsus404_admin@test.com")
        resp = client.put("/admin/users/999999/unsuspend", headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_non_admin_returns_403(self, client, db_session):
        target = create_test_user(db_session, email="unsus_nonadmin_target@test.com")
        u = create_test_user(db_session, email="unsus_nonadmin_actor@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.put(f"/admin/users/{target.user_id}/unsuspend", headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_returns_401(self, client, db_session):
        target = create_test_user(db_session, email="unsus_anon_target@test.com")
        resp = client.put(f"/admin/users/{target.user_id}/unsuspend")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
