"""
test_support_ticket.py

Unit and integration tests for routers/support_ticket.py.

Coverage targets:
Pure helper functions:
  - get_initials()      normal name, single name, empty strings
  - get_avatar_color()  deterministic output, full palette cycle (8 values)

Endpoint integration:
  - POST /support/tickets             success, invalid inputs (422), unauthenticated (401)
  - GET  /support/tickets/me          success, empty list, user isolation
  - GET  /support/tickets             admin success, non-admin (403)
  - PUT  /support/tickets/{id}/reply  success (in_progress/resolved), bad status (400),
                                      not found (404), non-admin (403)
  - PUT  /support/tickets/{id}/close  success, not found (404), non-admin (403)
"""

import pytest
from fastapi import status
from sqlmodel import select

from app.models import support_ticket, SupportTicketStatus, UserRole
from app.routers.support_ticket import get_initials, get_avatar_color
from .utils import create_test_user, get_auth_headers


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _admin_headers(db_session, email: str = "ticket_admin@test.com") -> dict:
    admin = create_test_user(db_session, email=email, role=UserRole.admin)
    return get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)


def _create_payload(
    category: str = "Bug",
    subject: str = "App crashes on launch",
    description: str = "The app crashes immediately after opening.",
) -> dict:
    return {"category": category, "subject": subject, "description": description}


def _seed_ticket(db_session, user_id: int, subject: str = "Test Issue") -> support_ticket:
    """Seeds a support ticket directly."""
    ticket = support_ticket(
        user_id=user_id,
        category="General",
        subject=subject,
        description="Test description.",
        status=SupportTicketStatus.open,
    )
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    return ticket


# ===========================================================================
# Pure helper: get_initials()
# ===========================================================================

class TestGetInitials:
    """Tests for the get_initials() helper function."""

    def test_normal_names_returns_two_uppercase_initials(self):
        assert get_initials("Alice", "Smith") == "AS"

    def test_empty_last_name_returns_single_initial(self):
        assert get_initials("Alice", "") == "A"

    def test_both_empty_returns_fallback_U(self):
        assert get_initials("", "") == "U"

    def test_lowercase_names_uppercased(self):
        assert get_initials("bob", "jones") == "BJ"

    def test_single_char_first_name(self):
        assert get_initials("Z", "Lee") == "ZL"


# ===========================================================================
# Pure helper: get_avatar_color()
# ===========================================================================

class TestGetAvatarColor:
    """Tests for the get_avatar_color() deterministic helper."""

    PALETTE = [
        "#10b981", "#3b82f6", "#f97316", "#8b5cf6",
        "#ec4899", "#14b8a6", "#f59e0b", "#6366f1",
    ]

    def test_same_user_id_always_same_color(self):
        """Same user_id always returns the same colour (deterministic)."""
        assert get_avatar_color(42) == get_avatar_color(42)

    def test_full_palette_covered_by_ids_0_to_7(self):
        """IDs 0–7 collectively cover all 8 palette colours."""
        returned = {get_avatar_color(i) for i in range(8)}
        assert returned == set(self.PALETTE)

    def test_id_zero_maps_to_first_entry(self):
        assert get_avatar_color(0) == self.PALETTE[0]

    def test_id_wraps_around_via_modulo(self):
        """ID 8 should equal ID 0 (modulo 8)."""
        assert get_avatar_color(8) == get_avatar_color(0)

    def test_returns_hex_string(self):
        """Each colour is a 7-char hex string starting with #."""
        for i in range(16):
            c = get_avatar_color(i)
            assert c.startswith("#") and len(c) == 7


# ===========================================================================
# Endpoint: POST /support/tickets
# ===========================================================================

class TestCreateSupportTicket:
    """Integration tests for POST /support/tickets."""

    def test_create_ticket_success(self, client, db_session):
        """Authenticated user creates a support ticket (201)."""
        u = create_test_user(db_session, email="ticket_create@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.post("/support/tickets", json=_create_payload(), headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data["subject"] == "App crashes on launch"
        assert data["status"] == "Open"
        assert data["admin_reply"] is None

    def test_create_persists_to_db(self, client, db_session):
        """Created ticket appears in support_ticket table."""
        u = create_test_user(db_session, email="ticket_persist@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        client.post("/support/tickets", json=_create_payload(subject="DB Check"), headers=headers)
        row = db_session.exec(
            select(support_ticket).where(support_ticket.user_id == u.user_id)
        ).first()
        assert row is not None
        assert row.subject == "DB Check"

    def test_empty_subject_returns_422(self, client, db_session):
        """Empty subject fails Pydantic validation."""
        u = create_test_user(db_session, email="ticket_bad_subj@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.post("/support/tickets", json=_create_payload(subject=""), headers=headers)
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_empty_description_returns_422(self, client, db_session):
        """Empty description fails Pydantic validation."""
        u = create_test_user(db_session, email="ticket_bad_desc@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.post("/support/tickets", json=_create_payload(description=""), headers=headers)
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_unauthenticated_returns_401(self, client):
        """Unauthenticated creation returns 401."""
        resp = client.post("/support/tickets", json=_create_payload())
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# Endpoint: GET /support/tickets/me
# ===========================================================================

class TestGetMyTickets:
    """Integration tests for GET /support/tickets/me."""

    def test_returns_own_tickets(self, client, db_session):
        """User sees their own tickets."""
        u = create_test_user(db_session, email="my_tickets@test.com")
        _seed_ticket(db_session, user_id=u.user_id, subject="My Ticket")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.get("/support/tickets/me", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert any(t["subject"] == "My Ticket" for t in resp.json())

    def test_returns_empty_list_when_no_tickets(self, client, db_session):
        """User with no tickets gets an empty list."""
        u = create_test_user(db_session, email="no_tickets@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.get("/support/tickets/me", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == []

    def test_user_isolation_cannot_see_others_tickets(self, client, db_session):
        """User A cannot see User B's tickets via /me."""
        user_a = create_test_user(db_session, email="iso_user_a@test.com")
        user_b = create_test_user(db_session, email="iso_user_b@test.com")
        _seed_ticket(db_session, user_id=user_b.user_id, subject="Private B Ticket")
        headers_a = get_auth_headers(user_id=user_a.user_id, email=user_a.email)
        resp = client.get("/support/tickets/me", headers=headers_a)
        assert resp.status_code == status.HTTP_200_OK
        assert all(t["subject"] != "Private B Ticket" for t in resp.json())

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/support/tickets/me")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# Endpoint: GET /support/tickets (admin)
# ===========================================================================

class TestGetAllTickets:
    """Integration tests for GET /support/tickets (admin-only)."""

    def test_admin_sees_all_tickets(self, client, db_session):
        """Admin receives a list with tickets from all users."""
        user_a = create_test_user(db_session, email="all_tkt_a@test.com")
        user_b = create_test_user(db_session, email="all_tkt_b@test.com")
        _seed_ticket(db_session, user_id=user_a.user_id, subject="Ticket A")
        _seed_ticket(db_session, user_id=user_b.user_id, subject="Ticket B")
        headers = _admin_headers(db_session, email="all_tkt_admin@test.com")
        resp = client.get("/support/tickets", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        subjects = [t["subject"] for t in resp.json()]
        assert "Ticket A" in subjects
        assert "Ticket B" in subjects

    def test_admin_response_includes_user_metadata(self, client, db_session):
        """Admin ticket view includes user_name, user_email, initials, avatar_color."""
        u = create_test_user(db_session, email="meta_user@test.com", first_name="Meta", last_name="Test")
        _seed_ticket(db_session, user_id=u.user_id)
        headers = _admin_headers(db_session, email="meta_admin@test.com")
        resp = client.get("/support/tickets", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        user_tickets = [t for t in resp.json() if t.get("user_email") == "meta_user@test.com"]
        assert len(user_tickets) >= 1
        for field in ("user_name", "user_initials", "avatar_color"):
            assert field in user_tickets[0]

    def test_non_admin_returns_403(self, client, db_session):
        """Non-admin user gets 403."""
        u = create_test_user(db_session, email="nonadmin_all_tkt@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.get("/support/tickets", headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ===========================================================================
# Endpoint: PUT /support/tickets/{id}/reply
# ===========================================================================

class TestReplyToTicket:
    """Integration tests for PUT /support/tickets/{id}/reply."""

    def test_reply_sets_in_progress(self, client, db_session):
        """Admin can reply and set status to 'In Progress'."""
        u = create_test_user(db_session, email="reply_user@test.com")
        ticket = _seed_ticket(db_session, user_id=u.user_id)
        headers = _admin_headers(db_session, email="reply_admin@test.com")
        payload = {"admin_reply": "We are looking into this.", "status": "In Progress"}
        resp = client.put(f"/support/tickets/{ticket.ticket_id}/reply", json=payload, headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["status"] == "In Progress"
        assert resp.json()["admin_reply"] == "We are looking into this."

    def test_reply_sets_resolved(self, client, db_session):
        """Admin can resolve a ticket with a reply."""
        u = create_test_user(db_session, email="resolve_user@test.com")
        ticket = _seed_ticket(db_session, user_id=u.user_id)
        headers = _admin_headers(db_session, email="resolve_admin@test.com")
        payload = {"admin_reply": "Fixed.", "status": "Resolved"}
        resp = client.put(f"/support/tickets/{ticket.ticket_id}/reply", json=payload, headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["status"] == "Resolved"

    def test_invalid_status_returns_400(self, client, db_session):
        """Replying with status 'Open' returns 400."""
        u = create_test_user(db_session, email="bad_status_user@test.com")
        ticket = _seed_ticket(db_session, user_id=u.user_id)
        headers = _admin_headers(db_session, email="bad_status_admin@test.com")
        payload = {"admin_reply": "Reply.", "status": "Open"}
        resp = client.put(f"/support/tickets/{ticket.ticket_id}/reply", json=payload, headers=headers)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_ticket_not_found_returns_404(self, client, db_session):
        """Replying to a nonexistent ticket returns 404."""
        headers = _admin_headers(db_session, email="notfound_reply_admin@test.com")
        payload = {"admin_reply": "Reply.", "status": "In Progress"}
        resp = client.put("/support/tickets/999999/reply", json=payload, headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_non_admin_returns_403(self, client, db_session):
        """Non-admin attempting a reply gets 403."""
        u = create_test_user(db_session, email="nonadmin_reply@test.com")
        ticket = _seed_ticket(db_session, user_id=u.user_id)
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        payload = {"admin_reply": "Sneaky reply.", "status": "In Progress"}
        resp = client.put(f"/support/tickets/{ticket.ticket_id}/reply", json=payload, headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ===========================================================================
# Endpoint: PUT /support/tickets/{id}/close
# ===========================================================================

class TestCloseTicket:
    """Integration tests for PUT /support/tickets/{id}/close."""

    def test_admin_closes_ticket_success(self, client, db_session):
        """Admin closes an open ticket → 200, status Resolved."""
        u = create_test_user(db_session, email="close_user@test.com")
        ticket = _seed_ticket(db_session, user_id=u.user_id)
        headers = _admin_headers(db_session, email="close_admin@test.com")
        resp = client.put(
            f"/support/tickets/{ticket.ticket_id}/close",
            json={"status": "Resolved"},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["status"] == "Resolved"

    def test_close_persists_resolved_to_db(self, client, db_session):
        """Closing persists Resolved status to the DB."""
        u = create_test_user(db_session, email="close_db@test.com")
        ticket = _seed_ticket(db_session, user_id=u.user_id)
        headers = _admin_headers(db_session, email="close_db_admin@test.com")
        client.put(
            f"/support/tickets/{ticket.ticket_id}/close",
            json={"status": "Resolved"},
            headers=headers,
        )
        db_session.refresh(ticket)
        assert ticket.status == SupportTicketStatus.resolved

    def test_ticket_not_found_returns_404(self, client, db_session):
        """Closing a nonexistent ticket returns 404."""
        headers = _admin_headers(db_session, email="close_404_admin@test.com")
        resp = client.put("/support/tickets/999999/close", json={"status": "Resolved"}, headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_non_admin_returns_403(self, client, db_session):
        """Non-admin attempting to close gets 403."""
        u = create_test_user(db_session, email="close_nonadmin@test.com")
        ticket = _seed_ticket(db_session, user_id=u.user_id)
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.put(
            f"/support/tickets/{ticket.ticket_id}/close",
            json={"status": "Resolved"},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
