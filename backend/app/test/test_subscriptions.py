"""
test_subscriptions.py

Unit and integration tests for routers/subscriptions.py.

Coverage targets:
Pure helper functions:
  - get_subscription_price()          monthly vs annual
  - calculate_subscription_end_at()   monthly (+30d), annual (+365d)
  - get_display_subscription_status() cancelling vs active vs expired
  - validate_mock_card_fields()       valid card, bad number/expiry/CVV

Endpoint integration:
  - POST /subscriptions/checkout       success (monthly/annual), admin blocked, already active, invalid card
  - GET  /subscriptions/my             active, cancelling, no subscription (inactive)
  - POST /subscriptions/cancel         success, no active (404), already cancelled (400)
  - GET  /subscriptions/transactions   populated, empty list
"""

import pytest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import HTTPException, status
from sqlmodel import select

from app.models import (
    user_subscription,
    subscription_transaction,
    UserRole,
    SubscriptionPlan,
    SubscriptionStatus,
    SubscriptionTransactionType,
    SubscriptionTransactionStatus,
)
from app.routers.subscriptions import (
    get_subscription_price,
    calculate_subscription_end_at,
    get_display_subscription_status,
    validate_mock_card_fields,
    MONTHLY_PRICE,
    ANNUAL_PRICE,
)
from .utils import create_test_user, get_auth_headers

SG_TZ = ZoneInfo("Asia/Singapore")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(SG_TZ)


def _valid_checkout_payload(plan: str = "monthly") -> dict:
    """Returns a valid checkout request body."""
    return {
        "plan": plan,
        "card_holder_name": "Test User",
        "card_number": "4111111111111111",
        "expiry_month": 12,
        "expiry_year": _now().year + 2,
        "cvv": "123",
    }


def _seed_active_subscription(
    db_session,
    user_id: int,
    plan: SubscriptionPlan = SubscriptionPlan.monthly,
    cancelled_at: datetime | None = None,
    end_at_offset_days: int = 30,
) -> user_subscription:
    """Seeds a single active subscription for the given user."""
    now = _now()
    sub = user_subscription(
        user_id=user_id,
        plan=plan,
        status=SubscriptionStatus.active,
        price=MONTHLY_PRICE if plan == SubscriptionPlan.monthly else ANNUAL_PRICE,
        currency="SGD",
        start_at=now,
        end_at=now + timedelta(days=end_at_offset_days),
        cancelled_at=cancelled_at,
        created_at=now,
        updated_at=now,
    )
    db_session.add(sub)
    db_session.commit()
    db_session.refresh(sub)
    return sub


# ===========================================================================
# Pure helper: get_subscription_price()
# ===========================================================================

class TestGetSubscriptionPrice:
    """Tests for the get_subscription_price() helper."""

    def test_monthly_price(self):
        """Monthly plan returns MONTHLY_PRICE (9.90 SGD)."""
        assert get_subscription_price(SubscriptionPlan.monthly) == MONTHLY_PRICE

    def test_annual_price(self):
        """Annual plan returns ANNUAL_PRICE (99.00 SGD)."""
        assert get_subscription_price(SubscriptionPlan.annual) == ANNUAL_PRICE


# ===========================================================================
# Pure helper: calculate_subscription_end_at()
# ===========================================================================

class TestCalculateSubscriptionEndAt:
    """Tests for the calculate_subscription_end_at() helper."""

    def test_monthly_adds_30_days(self):
        """Monthly plan end date is exactly 30 days after start."""
        start = _now()
        end = calculate_subscription_end_at(start, SubscriptionPlan.monthly)
        assert end == start + timedelta(days=30)

    def test_annual_adds_365_days(self):
        """Annual plan end date is exactly 365 days after start."""
        start = _now()
        end = calculate_subscription_end_at(start, SubscriptionPlan.annual)
        assert end == start + timedelta(days=365)

    def test_monthly_shorter_than_annual(self):
        """Monthly end date is earlier than annual end date for same start."""
        start = _now()
        assert (
            calculate_subscription_end_at(start, SubscriptionPlan.monthly)
            < calculate_subscription_end_at(start, SubscriptionPlan.annual)
        )


# ===========================================================================
# Pure helper: get_display_subscription_status()
# ===========================================================================

class TestGetDisplaySubscriptionStatus:
    """Tests for get_display_subscription_status()."""

    def _make_sub(
        self,
        sub_status: SubscriptionStatus = SubscriptionStatus.active,
        cancelled_at: datetime | None = None,
        end_at: datetime | None = None,
    ) -> user_subscription:
        """Creates an in-memory user_subscription for testing (not persisted)."""
        now = _now()
        return user_subscription(
            user_id=1,
            plan=SubscriptionPlan.monthly,
            status=sub_status,
            price=MONTHLY_PRICE,
            currency="SGD",
            start_at=now,
            end_at=end_at,
            cancelled_at=cancelled_at,
            created_at=now,
            updated_at=now,
        )

    def test_active_no_cancellation_returns_active(self):
        """Active sub with no cancelled_at → 'active'."""
        sub = self._make_sub(
            sub_status=SubscriptionStatus.active,
            cancelled_at=None,
            end_at=_now() + timedelta(days=30),
        )
        assert get_display_subscription_status(sub) == "active"

    def test_active_with_cancelled_at_future_end_returns_cancelling(self):
        """Active sub with cancelled_at set and end_at in future → 'cancelling'."""
        now = _now()
        sub = self._make_sub(
            sub_status=SubscriptionStatus.active,
            cancelled_at=now,
            end_at=now + timedelta(days=15),
        )
        assert get_display_subscription_status(sub) == "cancelling"

    def test_expired_status_returns_expired(self):
        """Expired subscription returns 'expired'."""
        sub = self._make_sub(sub_status=SubscriptionStatus.expired)
        assert get_display_subscription_status(sub) == "expired"


# ===========================================================================
# Pure helper: validate_mock_card_fields()
# ===========================================================================

class TestValidateMockCardFields:
    """Tests for validate_mock_card_fields()."""

    def _valid_call(self, **overrides):
        kwargs = {
            "card_holder_name": "Test User",
            "card_number": "4111111111111111",
            "expiry_month": 12,
            "expiry_year": _now().year + 2,
            "cvv": "123",
        }
        kwargs.update(overrides)
        return validate_mock_card_fields(**kwargs)

    def test_valid_card_passes(self):
        """A fully valid card raises no exception."""
        self._valid_call()  # Should not raise

    def test_empty_card_holder_name_raises_400(self):
        """Blank card_holder_name raises HTTPException 400."""
        with pytest.raises(HTTPException) as exc:
            self._valid_call(card_holder_name="   ")
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_card_number_too_short_raises_400(self):
        """Card number < 12 digits raises 400."""
        with pytest.raises(HTTPException) as exc:
            self._valid_call(card_number="12345")
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_card_number_too_long_raises_400(self):
        """Card number > 19 digits raises 400."""
        with pytest.raises(HTTPException) as exc:
            self._valid_call(card_number="1" * 20)
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_expiry_month_zero_raises_400(self):
        with pytest.raises(HTTPException) as exc:
            self._valid_call(expiry_month=0)
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_expiry_month_thirteen_raises_400(self):
        with pytest.raises(HTTPException) as exc:
            self._valid_call(expiry_month=13)
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_past_expiry_year_raises_400(self):
        with pytest.raises(HTTPException) as exc:
            self._valid_call(expiry_year=_now().year - 1)
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_non_digit_cvv_raises_400(self):
        with pytest.raises(HTTPException) as exc:
            self._valid_call(cvv="12x")
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_two_digit_cvv_raises_400(self):
        with pytest.raises(HTTPException) as exc:
            self._valid_call(cvv="12")
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_four_digit_cvv_passes(self):
        """A 4-digit CVV (AMEX style) is valid."""
        self._valid_call(cvv="1234")  # Should not raise


# ===========================================================================
# Endpoint: POST /subscriptions/checkout
# ===========================================================================

class TestSubscriptionCheckout:
    """Integration tests for POST /subscriptions/checkout."""

    def test_monthly_checkout_success(self, client, db_session):
        """Freemium user checks out a monthly subscription successfully."""
        u = create_test_user(db_session, email="checkout_monthly@test.com", role=UserRole.freemium)
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.freemium)
        resp = client.post("/subscriptions/checkout", json=_valid_checkout_payload("monthly"), headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data["plan"] == "monthly"
        assert data["status"] == "active"
        assert data["amount"] == MONTHLY_PRICE
        assert data["currency"] == "SGD"

    def test_annual_checkout_success(self, client, db_session):
        """Freemium user checks out an annual subscription successfully."""
        u = create_test_user(db_session, email="checkout_annual@test.com", role=UserRole.freemium)
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.freemium)
        resp = client.post("/subscriptions/checkout", json=_valid_checkout_payload("annual"), headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data["plan"] == "annual"
        assert data["amount"] == ANNUAL_PRICE

    def test_checkout_upgrades_role_to_premium(self, client, db_session):
        """After checkout the returned role is 'premium'."""
        u = create_test_user(db_session, email="upgrade_role@test.com", role=UserRole.freemium)
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.freemium)
        resp = client.post("/subscriptions/checkout", json=_valid_checkout_payload(), headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.json()["role"] == "premium"

    def test_admin_cannot_checkout_400(self, client, db_session):
        """Admin users receive 400 when attempting to subscribe."""
        admin = create_test_user(db_session, email="admin_checkout@test.com", role=UserRole.admin)
        headers = get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)
        resp = client.post("/subscriptions/checkout", json=_valid_checkout_payload(), headers=headers)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_double_checkout_returns_400(self, client, db_session):
        """User with an existing active subscription gets 400."""
        u = create_test_user(db_session, email="double_sub@test.com", role=UserRole.freemium)
        _seed_active_subscription(db_session, user_id=u.user_id)
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.freemium)
        resp = client.post("/subscriptions/checkout", json=_valid_checkout_payload(), headers=headers)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_card_number_returns_400(self, client, db_session):
        """Card number that is too short returns 400."""
        u = create_test_user(db_session, email="bad_card@test.com", role=UserRole.freemium)
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.freemium)
        payload = _valid_checkout_payload()
        payload["card_number"] = "123"
        resp = client.post("/subscriptions/checkout", json=payload, headers=headers)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_returns_401(self, client):
        """Unauthenticated checkout returns 401."""
        resp = client.post("/subscriptions/checkout", json=_valid_checkout_payload())
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_checkout_creates_transaction_record(self, client, db_session):
        """Successful checkout creates a subscription_transaction row."""
        u = create_test_user(db_session, email="txn_check@test.com", role=UserRole.freemium)
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.freemium)
        client.post("/subscriptions/checkout", json=_valid_checkout_payload(), headers=headers)
        txns = db_session.exec(
            select(subscription_transaction).where(subscription_transaction.user_id == u.user_id)
        ).all()
        assert len(txns) == 1
        assert txns[0].transaction_type == SubscriptionTransactionType.checkout
        assert txns[0].status == SubscriptionTransactionStatus.success


# ===========================================================================
# Endpoint: GET /subscriptions/my
# ===========================================================================

class TestGetMySubscription:
    """Integration tests for GET /subscriptions/my."""

    def test_active_subscription_returns_correct_data(self, client, db_session):
        """User with an active subscription sees plan and status details."""
        u = create_test_user(db_session, email="my_sub_active@test.com", role=UserRole.premium)
        _seed_active_subscription(db_session, user_id=u.user_id)
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.premium)
        resp = client.get("/subscriptions/my", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["plan"] == "monthly"
        assert data["status"] == "active"
        assert data["currency"] == "SGD"

    def test_cancelling_subscription_shows_cancelling(self, client, db_session):
        """Active subscription with cancelled_at set → status 'cancelling'."""
        u = create_test_user(db_session, email="cancelling_sub@test.com", role=UserRole.premium)
        _seed_active_subscription(db_session, user_id=u.user_id, cancelled_at=_now())
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.premium)
        resp = client.get("/subscriptions/my", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["status"] == "cancelling"

    def test_no_subscription_returns_inactive(self, client, db_session):
        """User with no subscription at all receives status 'inactive'."""
        u = create_test_user(db_session, email="no_sub@test.com", role=UserRole.freemium)
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.freemium)
        resp = client.get("/subscriptions/my", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["status"] == "inactive"
        assert data["subscription_id"] is None

    def test_unauthenticated_returns_401(self, client):
        """GET /subscriptions/my without token returns 401."""
        resp = client.get("/subscriptions/my")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# Endpoint: POST /subscriptions/cancel
# ===========================================================================

class TestCancelSubscription:
    """Integration tests for POST /subscriptions/cancel."""

    def test_cancel_active_subscription_success(self, client, db_session):
        """Cancelling an active subscription succeeds."""
        u = create_test_user(db_session, email="cancel_ok@test.com", role=UserRole.premium)
        sub = _seed_active_subscription(db_session, user_id=u.user_id)
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.premium)
        resp = client.post("/subscriptions/cancel", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["subscription_id"] == sub.subscription_id
        assert data["cancelled_at"] is not None

    def test_cancel_creates_cancel_transaction(self, client, db_session):
        """Cancellation creates a cancel-type transaction record."""
        u = create_test_user(db_session, email="cancel_txn@test.com", role=UserRole.premium)
        _seed_active_subscription(db_session, user_id=u.user_id)
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.premium)
        client.post("/subscriptions/cancel", headers=headers)
        txns = db_session.exec(
            select(subscription_transaction).where(
                subscription_transaction.user_id == u.user_id,
                subscription_transaction.transaction_type == SubscriptionTransactionType.cancel,
            )
        ).all()
        assert len(txns) == 1

    def test_cancel_no_subscription_returns_404(self, client, db_session):
        """Cancelling without an active subscription returns 404."""
        u = create_test_user(db_session, email="cancel_none@test.com", role=UserRole.freemium)
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.freemium)
        resp = client.post("/subscriptions/cancel", headers=headers)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_cancel_already_cancelled_returns_400(self, client, db_session):
        """Cancelling an already-scheduled-for-cancellation subscription returns 400."""
        u = create_test_user(db_session, email="cancel_twice@test.com", role=UserRole.premium)
        _seed_active_subscription(db_session, user_id=u.user_id, cancelled_at=_now())
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.premium)
        resp = client.post("/subscriptions/cancel", headers=headers)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_cancel_unauthenticated_returns_401(self, client):
        """Unauthenticated cancel returns 401."""
        resp = client.post("/subscriptions/cancel")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# Endpoint: GET /subscriptions/transactions
# ===========================================================================

class TestGetSubscriptionTransactions:
    """Integration tests for GET /subscriptions/transactions."""

    def _seed_txn(self, db_session, user_id: int, sub_id: int) -> subscription_transaction:
        txn = subscription_transaction(
            user_id=user_id,
            subscription_id=sub_id,
            transaction_type=SubscriptionTransactionType.checkout,
            status=SubscriptionTransactionStatus.success,
            plan=SubscriptionPlan.monthly,
            amount=MONTHLY_PRICE,
            currency="SGD",
            payment_provider="mock_gateway",
            provider_reference="mock_ref",
            message="Test",
        )
        db_session.add(txn)
        db_session.commit()
        db_session.refresh(txn)
        return txn

    def test_returns_populated_list(self, client, db_session):
        """User with transactions sees them in the response."""
        u = create_test_user(db_session, email="txns_list@test.com", role=UserRole.premium)
        sub = _seed_active_subscription(db_session, user_id=u.user_id)
        self._seed_txn(db_session, user_id=u.user_id, sub_id=sub.subscription_id)
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.premium)
        resp = client.get("/subscriptions/transactions", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["type"] == "checkout"

    def test_returns_empty_list_for_no_transactions(self, client, db_session):
        """User with no transactions gets an empty list."""
        u = create_test_user(db_session, email="no_txns@test.com", role=UserRole.freemium)
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.freemium)
        resp = client.get("/subscriptions/transactions", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == []

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/subscriptions/transactions")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_transactions_ordered_newest_first(self, client, db_session):
        """Transactions are returned in descending created_at order."""
        u = create_test_user(db_session, email="txn_order@test.com", role=UserRole.premium)
        sub = _seed_active_subscription(db_session, user_id=u.user_id)
        for _ in range(3):
            t = subscription_transaction(
                user_id=u.user_id,
                subscription_id=sub.subscription_id,
                transaction_type=SubscriptionTransactionType.checkout,
                status=SubscriptionTransactionStatus.success,
                plan=SubscriptionPlan.monthly,
                amount=MONTHLY_PRICE,
                currency="SGD",
            )
            db_session.add(t)
        db_session.commit()
        headers = get_auth_headers(user_id=u.user_id, email=u.email, role=UserRole.premium)
        resp = client.get("/subscriptions/transactions", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        timestamps = [r["created_at"] for r in resp.json()]
        assert timestamps == sorted(timestamps, reverse=True)
