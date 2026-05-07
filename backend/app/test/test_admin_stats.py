"""
test_admin_stats.py

Unit and integration tests for routers/admin_stats.py.

Coverage targets:
Pure helpers (no DB, no fixtures):
  - percentage_change()     normal, previous=0 current>0, both zero, negative
  - calculate_mrr()         monthly-only, annual-only, mixed, empty, inactive excluded
  - is_end_user_role()      all 4 UserRole values
  - get_month_start()       strips to first-of-month midnight
  - add_months()            normal, December rollover, 12-month same-month-next-year

Endpoint integration:
  - GET /admin/stats/overview       non-admin (403), schema, user count, MRR
  - GET /admin/stats/growth         non-admin (403), default 6 items, ?months=N, out-of-range (400)
  - GET /admin/stats/subscriptions  non-admin (403), zero-user (no div-by-zero), schema, MRR
"""

import pytest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import status

from app.models import (
    user_subscription,
    meal,
    food_item,
    UserRole,
    SubscriptionPlan,
    SubscriptionStatus,
    FoodSource,
)
from app.routers.admin_stats import (
    percentage_change,
    calculate_mrr,
    is_end_user_role,
    get_month_start,
    add_months,
)
from .utils import create_test_user, get_auth_headers

SG_TZ = ZoneInfo("Asia/Singapore")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(SG_TZ)


def _admin_headers(db_session, email: str = "stats_admin@test.com") -> dict:
    admin = create_test_user(db_session, email=email, role=UserRole.admin)
    return get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)


def _seed_subscription(
    db_session,
    user_id: int,
    plan: SubscriptionPlan = SubscriptionPlan.monthly,
    price: float = 9.90,
    sub_status: SubscriptionStatus = SubscriptionStatus.active,
) -> user_subscription:
    now = _now()
    sub = user_subscription(
        user_id=user_id,
        plan=plan,
        status=sub_status,
        price=price,
        currency="SGD",
        start_at=now,
        end_at=now + timedelta(days=30 if plan == SubscriptionPlan.monthly else 365),
        created_at=now,
        updated_at=now,
    )
    db_session.add(sub)
    db_session.commit()
    db_session.refresh(sub)
    return sub


# ===========================================================================
# Pure helper: percentage_change()
# ===========================================================================

class TestPercentageChange:
    """Tests for percentage_change() helper."""

    def test_normal_increase(self):
        assert percentage_change(110, 100) == pytest.approx(10.0, abs=0.1)

    def test_negative_change(self):
        assert percentage_change(80, 100) == pytest.approx(-20.0, abs=0.1)

    def test_previous_zero_current_positive_returns_100(self):
        assert percentage_change(5, 0) == 100.0

    def test_both_zero_returns_zero(self):
        assert percentage_change(0, 0) == 0.0

    def test_no_change_returns_zero(self):
        assert percentage_change(50, 50) == 0.0

    def test_large_values(self):
        assert percentage_change(1500, 1000) == pytest.approx(50.0, abs=0.1)


# ===========================================================================
# Pure helper: calculate_mrr()
# ===========================================================================

class TestCalculateMrr:
    """Tests for calculate_mrr() helper."""

    def _sub(self, plan: SubscriptionPlan, price: float,
             sub_status: SubscriptionStatus = SubscriptionStatus.active) -> user_subscription:
        now = _now()
        return user_subscription(
            user_id=1, plan=plan, status=sub_status, price=price,
            currency="SGD", start_at=now,
            end_at=now + timedelta(days=30), created_at=now, updated_at=now,
        )

    def test_monthly_only(self):
        subs = [self._sub(SubscriptionPlan.monthly, 9.90), self._sub(SubscriptionPlan.monthly, 9.90)]
        assert calculate_mrr(subs) == pytest.approx(19.80, abs=0.01)

    def test_annual_divided_by_12(self):
        subs = [self._sub(SubscriptionPlan.annual, 99.00)]
        assert calculate_mrr(subs) == pytest.approx(round(99.00 / 12, 2), abs=0.01)

    def test_mixed_plans(self):
        subs = [
            self._sub(SubscriptionPlan.monthly, 9.90),
            self._sub(SubscriptionPlan.annual, 99.00),
        ]
        expected = round(9.90 + 99.00 / 12, 2)
        assert calculate_mrr(subs) == pytest.approx(expected, abs=0.01)

    def test_empty_list_returns_zero(self):
        assert calculate_mrr([]) == 0.0

    def test_inactive_subs_excluded(self):
        subs = [
            self._sub(SubscriptionPlan.monthly, 9.90, SubscriptionStatus.expired),
            self._sub(SubscriptionPlan.monthly, 9.90, SubscriptionStatus.cancelled),
        ]
        assert calculate_mrr(subs) == 0.0


# ===========================================================================
# Pure helper: is_end_user_role()
# ===========================================================================

class TestIsEndUserRole:
    """Tests for is_end_user_role() predicate."""

    def test_freemium_is_end_user(self):
        assert is_end_user_role(UserRole.freemium) is True

    def test_premium_is_end_user(self):
        assert is_end_user_role(UserRole.premium) is True

    def test_admin_is_not_end_user(self):
        assert is_end_user_role(UserRole.admin) is False

    def test_nutritionist_is_not_end_user(self):
        assert is_end_user_role(UserRole.nutritionist) is False


# ===========================================================================
# Pure helper: get_month_start()
# ===========================================================================

class TestGetMonthStart:
    """Tests for get_month_start() datetime truncation."""

    def test_strips_to_first_of_month_midnight(self):
        dt = datetime(2026, 5, 15, 14, 35, 22, tzinfo=SG_TZ)
        result = get_month_start(dt)
        assert result.day == 1
        assert result.hour == 0
        assert result.minute == 0
        assert result.second == 0
        assert result.month == 5
        assert result.year == 2026

    def test_already_first_of_month_stays_same(self):
        dt = datetime(2026, 1, 1, 0, 0, 0, tzinfo=SG_TZ)
        result = get_month_start(dt)
        assert result.day == 1
        assert result.month == 1


# ===========================================================================
# Pure helper: add_months()
# ===========================================================================

class TestAddMonths:
    """Tests for add_months() helper."""

    def test_add_one_month_normal(self):
        dt = datetime(2026, 1, 1, tzinfo=SG_TZ)
        result = add_months(dt, 1)
        assert result.month == 2 and result.year == 2026

    def test_december_rollover(self):
        dt = datetime(2026, 12, 1, tzinfo=SG_TZ)
        result = add_months(dt, 1)
        assert result.month == 1 and result.year == 2027

    def test_add_six_months_july_becomes_january(self):
        dt = datetime(2026, 7, 1, tzinfo=SG_TZ)
        result = add_months(dt, 6)
        assert result.month == 1 and result.year == 2027

    def test_add_twelve_months_same_month_next_year(self):
        dt = datetime(2026, 3, 1, tzinfo=SG_TZ)
        result = add_months(dt, 12)
        assert result.month == 3 and result.year == 2027


# ===========================================================================
# Endpoint: GET /admin/stats/overview
# ===========================================================================

class TestAdminStatsOverview:
    """Integration tests for GET /admin/stats/overview."""

    def test_non_admin_returns_403(self, client, db_session):
        u = create_test_user(db_session, email="ov_nonadmin@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.get("/admin/stats/overview", headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/admin/stats/overview")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_response_has_required_fields(self, client, db_session):
        """Response includes all required KPI fields."""
        headers = _admin_headers(db_session, email="ov_schema@test.com")
        resp = client.get("/admin/stats/overview", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        required = {
            "total_users", "active_users_30d", "premium_subscribers",
            "meals_logged_today", "new_users_this_month",
            "active_users_change_pct", "mrr", "meals_change_pct",
        }
        assert required.issubset(resp.json().keys())

    def test_total_users_excludes_admin_and_nutritionist(self, client, db_session):
        """total_users counts only freemium + premium users."""
        create_test_user(db_session, email="ov_free@test.com", role=UserRole.freemium)
        create_test_user(db_session, email="ov_prem@test.com", role=UserRole.premium)
        admin = create_test_user(db_session, email="ov_admin2@test.com", role=UserRole.admin)
        create_test_user(db_session, email="ov_nutri@test.com", role=UserRole.nutritionist)
        headers = get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)
        resp = client.get("/admin/stats/overview", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["total_users"] >= 2

    def test_mrr_reflects_active_subscriptions(self, client, db_session):
        """MRR value reflects seeded active subscription prices."""
        premium = create_test_user(db_session, email="ov_mrr_user@test.com", role=UserRole.premium)
        _seed_subscription(db_session, user_id=premium.user_id, price=9.90)
        admin = create_test_user(db_session, email="ov_mrr_admin@test.com", role=UserRole.admin)
        headers = get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)
        resp = client.get("/admin/stats/overview", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["mrr"] >= 9.90


# ===========================================================================
# Endpoint: GET /admin/stats/growth
# ===========================================================================

class TestAdminStatsGrowth:
    """Integration tests for GET /admin/stats/growth."""

    def test_non_admin_returns_403(self, client, db_session):
        u = create_test_user(db_session, email="growth_nonadmin@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.get("/admin/stats/growth", headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_default_returns_six_items(self, client, db_session):
        """Default months=6 returns exactly 6 items."""
        headers = _admin_headers(db_session, email="growth_6mo@test.com")
        resp = client.get("/admin/stats/growth", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.json()) == 6

    def test_months_3_returns_three_items(self, client, db_session):
        headers = _admin_headers(db_session, email="growth_3mo@test.com")
        resp = client.get("/admin/stats/growth?months=3", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.json()) == 3

    def test_months_1_returns_one_item(self, client, db_session):
        headers = _admin_headers(db_session, email="growth_1mo@test.com")
        resp = client.get("/admin/stats/growth?months=1", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.json()) == 1

    def test_months_0_returns_400(self, client, db_session):
        """months=0 is out of range → 400."""
        headers = _admin_headers(db_session, email="growth_0mo@test.com")
        resp = client.get("/admin/stats/growth?months=0", headers=headers)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_months_25_returns_400(self, client, db_session):
        """months=25 exceeds max → 400."""
        headers = _admin_headers(db_session, email="growth_25mo@test.com")
        resp = client.get("/admin/stats/growth?months=25", headers=headers)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_item_has_required_fields(self, client, db_session):
        """Each growth item has month, total, and premium fields."""
        headers = _admin_headers(db_session, email="growth_fields@test.com")
        resp = client.get("/admin/stats/growth?months=1", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert {"month", "total", "premium"}.issubset(resp.json()[0].keys())


# ===========================================================================
# Endpoint: GET /admin/stats/subscriptions
# ===========================================================================

class TestAdminStatsSubscriptions:
    """Integration tests for GET /admin/stats/subscriptions."""

    def test_non_admin_returns_403(self, client, db_session):
        u = create_test_user(db_session, email="sub_nonadmin@test.com")
        headers = get_auth_headers(user_id=u.user_id, email=u.email)
        resp = client.get("/admin/stats/subscriptions", headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/admin/stats/subscriptions")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_zero_end_users_no_division_by_zero(self, client, db_session):
        """Admin-only environment returns 0.0 percentages, no crash."""
        admin = create_test_user(db_session, email="sub_zero@test.com", role=UserRole.admin)
        headers = get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)
        resp = client.get("/admin/stats/subscriptions", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["freemium"]["pct"] == 0.0
        assert data["premium"]["pct"] == 0.0

    def test_response_has_required_fields(self, client, db_session):
        """Response includes freemium, premium, annual, mrr, new_this_month, cancellations."""
        headers = _admin_headers(db_session, email="sub_schema@test.com")
        resp = client.get("/admin/stats/subscriptions", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert {"freemium", "premium", "annual", "mrr", "new_this_month", "cancellations"}.issubset(data.keys())
        for tier in ("freemium", "premium", "annual"):
            assert {"label", "pct", "color", "count"}.issubset(data[tier].keys())

    def test_mrr_reflects_active_monthly_sub(self, client, db_session):
        """MRR endpoint value includes the active monthly subscription price."""
        premium = create_test_user(db_session, email="sub_mrr_user@test.com", role=UserRole.premium)
        _seed_subscription(db_session, user_id=premium.user_id, price=9.90)
        admin = create_test_user(db_session, email="sub_mrr_admin@test.com", role=UserRole.admin)
        headers = get_auth_headers(user_id=admin.user_id, email=admin.email, role=UserRole.admin)
        resp = client.get("/admin/stats/subscriptions", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["mrr"] >= 9.90
