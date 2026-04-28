"""
test_audit_log.py

Tests for the admin audit logging system:
- GET /admin/audit-logs endpoint
- Automatic log creation for auth events
- Automatic log creation for admin user management actions
- Authorization and pagination edge cases
"""

import pytest
from fastapi import status
from sqlmodel import select

from app.models import audit_log, AuditLogType, UserRole, user
from .utils import create_test_user, get_auth_headers


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _admin_headers(db_session, email: str = "admin@nutritrack.com") -> dict:
    admin = create_test_user(db_session, email=email, role=UserRole.admin)
    return get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)


def _count_logs(db_session, action: str) -> int:
    return len(db_session.exec(
        select(audit_log).where(audit_log.action == action)
    ).all())


# ---------------------------------------------------------------------------
# GET /admin/audit-logs — authorisation
# ---------------------------------------------------------------------------

def test_audit_logs_requires_authentication(client):
    """No token → 401."""
    response = client.get("/admin/audit-logs")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_audit_logs_requires_admin_role(client, db_session):
    """Authenticated non-admin → 403."""
    freemium = create_test_user(db_session, email="free@test.com", role=UserRole.freemium)
    headers = get_auth_headers(user_id=freemium.user_id, email=freemium.email, role=UserRole.freemium)
    response = client.get("/admin/audit-logs", headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_audit_logs_returns_200_for_admin(client, db_session):
    """Admin token → 200 with a list response."""
    headers = _admin_headers(db_session)
    response = client.get("/admin/audit-logs", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert isinstance(response.json(), list)


# ---------------------------------------------------------------------------
# GET /admin/audit-logs — response schema
# ---------------------------------------------------------------------------

def test_audit_log_response_has_required_fields(client, db_session):
    """Every returned object must include all required AuditLog fields."""
    headers = _admin_headers(db_session)
    client.get("/admin/audit-logs", headers=headers)  # generates at least one log
    response = client.get("/admin/audit-logs", headers=headers)
    assert response.status_code == status.HTTP_200_OK

    required_fields = {"id", "action", "detail", "type", "admin_email", "timestamp", "ip_address"}
    for record in response.json():
        assert required_fields.issubset(record.keys()), f"Missing fields in: {record.keys()}"


def test_audit_logs_sorted_newest_first(client, db_session):
    """Records must be ordered by timestamp descending."""
    headers = _admin_headers(db_session, email="sort_admin@test.com")
    for _ in range(3):
        client.get("/admin/audit-logs", headers=headers)

    response = client.get("/admin/audit-logs", headers=headers)
    timestamps = [r["timestamp"] for r in response.json()]
    assert timestamps == sorted(timestamps, reverse=True)


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

def test_audit_logs_pagination_limit(client, db_session):
    """limit parameter caps the number of returned records."""
    headers = _admin_headers(db_session, email="page_admin@test.com")
    for _ in range(5):
        client.get("/admin/audit-logs", headers=headers)

    response = client.get("/admin/audit-logs?limit=2", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()) <= 2


def test_audit_logs_pagination_invalid_limit(client, db_session):
    """limit=0 is rejected as unprocessable."""
    headers = _admin_headers(db_session, email="inv_admin@test.com")
    response = client.get("/admin/audit-logs?limit=0", headers=headers)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ---------------------------------------------------------------------------
# Auth audit events
# ---------------------------------------------------------------------------

def test_failed_login_creates_warning_log(client, db_session):
    """A failed login attempt must write a warning-type audit entry."""
    before = _count_logs(db_session, "failed_login")
    client.post("/auth/token/", data={"username": "nobody@test.com", "password": "wrong"})
    after = _count_logs(db_session, "failed_login")
    assert after == before + 1

    log_entry = db_session.exec(
        select(audit_log).where(audit_log.action == "failed_login").order_by(audit_log.timestamp.desc())
    ).first()
    assert log_entry is not None
    assert log_entry.type == AuditLogType.warning
    assert "nobody@test.com" in log_entry.detail


def test_admin_login_creates_auth_log(client, db_session):
    """A successful admin login must write an auth-type audit entry."""
    from app.routers.auth import bcrypt_context
    admin = create_test_user(
        db_session,
        email="loginlog@test.com",
        role=UserRole.admin,
        hashed_password=bcrypt_context.hash("securepass"),
    )
    before = _count_logs(db_session, "admin_login")
    client.post("/auth/token/", data={"username": admin.email, "password": "securepass"})
    after = _count_logs(db_session, "admin_login")
    assert after == before + 1


def test_freemium_login_does_not_create_auth_log(client, db_session):
    """A successful non-admin login must NOT write an admin_login entry."""
    from app.routers.auth import bcrypt_context
    freemium = create_test_user(
        db_session,
        email="freeuser@test.com",
        role=UserRole.freemium,
        hashed_password=bcrypt_context.hash("securepass"),
    )
    before = _count_logs(db_session, "admin_login")
    client.post("/auth/token/", data={"username": freemium.email, "password": "securepass"})
    after = _count_logs(db_session, "admin_login")
    assert after == before  # no new admin_login log


# ---------------------------------------------------------------------------
# Admin user management audit events
# ---------------------------------------------------------------------------

def test_view_user_creates_data_access_log(client, db_session):
    """Opening a user profile must write a data_access log."""
    target = create_test_user(db_session, email="target@test.com")
    headers = _admin_headers(db_session, email="viewer_admin@test.com")
    before = _count_logs(db_session, "user_profile_viewed")
    response = client.get(f"/admin/users/{target.user_id}", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert _count_logs(db_session, "user_profile_viewed") == before + 1


def test_suspend_user_creates_user_action_log(client, db_session):
    """Suspending a user must write a user_action log."""
    target = create_test_user(db_session, email="sus_target@test.com")
    headers = _admin_headers(db_session, email="sus_admin@test.com")
    before = _count_logs(db_session, "user_suspended")
    response = client.put(f"/admin/users/{target.user_id}/suspend", headers=headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert _count_logs(db_session, "user_suspended") == before + 1


def test_suspend_already_suspended_user_returns_409(client, db_session):
    """Suspending an already-suspended user returns 409 and does not log."""
    target = create_test_user(db_session, email="already_sus@test.com")
    headers = _admin_headers(db_session, email="admin_sus2@test.com")
    client.put(f"/admin/users/{target.user_id}/suspend", headers=headers)
    before = _count_logs(db_session, "user_suspended")
    response = client.put(f"/admin/users/{target.user_id}/suspend", headers=headers)
    assert response.status_code == status.HTTP_409_CONFLICT
    assert _count_logs(db_session, "user_suspended") == before


def test_delete_user_creates_user_action_log(client, db_session):
    """Deleting a user must write a user_action log."""
    target = create_test_user(db_session, email="del_target@test.com")
    headers = _admin_headers(db_session, email="del_admin@test.com")
    before = _count_logs(db_session, "user_deleted")
    response = client.delete(f"/admin/users/{target.user_id}", headers=headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert _count_logs(db_session, "user_deleted") == before + 1


def test_view_nonexistent_user_returns_404_no_log(client, db_session):
    """Requesting a user that does not exist returns 404 and does not log."""
    headers = _admin_headers(db_session, email="nouser_admin@test.com")
    before = _count_logs(db_session, "user_profile_viewed")
    response = client.get("/admin/users/999999", headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert _count_logs(db_session, "user_profile_viewed") == before


def test_role_change_creates_user_action_log(client, db_session):
    """Changing a user's role must write a user_action log."""
    target = create_test_user(db_session, email="role_target@test.com", role=UserRole.freemium)
    headers = _admin_headers(db_session, email="role_admin@test.com")
    before = _count_logs(db_session, "user_role_changed")
    response = client.put(
        f"/admin/users/{target.user_id}/role",
        json={"new_role": "premium"},
        headers=headers,
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert _count_logs(db_session, "user_role_changed") == before + 1


# ---------------------------------------------------------------------------
# Bulk access / export audit events
# ---------------------------------------------------------------------------

def test_bulk_export_creates_warning_log(client, db_session):
    """Bulk export endpoint must write a warning-type log."""
    headers = _admin_headers(db_session, email="export_admin@test.com")
    before = _count_logs(db_session, "bulk_data_export")
    response = client.get("/admin/export", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert _count_logs(db_session, "bulk_data_export") == before + 1

    log_entry = db_session.exec(
        select(audit_log)
        .where(audit_log.action == "bulk_data_export")
        .order_by(audit_log.timestamp.desc())
    ).first()
    assert log_entry.type == AuditLogType.warning