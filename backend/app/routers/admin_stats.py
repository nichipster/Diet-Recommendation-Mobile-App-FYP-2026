from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from calendar import month_abbr

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import (
    user,
    meal,
    user_subscription,
    UserRole,
    SubscriptionPlan,
    SubscriptionStatus
)


router = APIRouter(
    prefix="/admin/stats",
    tags=["Admin Stats"]
)


# =========================
# Helper functions
# =========================

def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))


def get_month_start(dt: datetime) -> datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def add_months(dt: datetime, months: int) -> datetime:
    year = dt.year + (dt.month - 1 + months) // 12
    month = (dt.month - 1 + months) % 12 + 1
    return dt.replace(year=year, month=month, day=1)


def require_admin(current_user: user_dependency) -> dict:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user


def percentage_change(current_value: int, previous_value: int) -> float:
    if previous_value == 0:
        if current_value == 0:
            return 0.0
        return 100.0
    return round(((current_value - previous_value) / previous_value) * 100, 1)


def is_end_user_role(role: UserRole) -> bool:
    return role in {
        UserRole.freemium,
        UserRole.premium
    }


def calculate_mrr(subscriptions: list[user_subscription]) -> float:
    active_subscriptions = [
        s for s in subscriptions
        if s.status == SubscriptionStatus.active
    ]

    monthly_total = sum(
        s.price for s in active_subscriptions
        if s.plan == SubscriptionPlan.monthly
    )

    annual_total = sum(
        s.price / 12 for s in active_subscriptions
        if s.plan == SubscriptionPlan.annual
    )

    return round(monthly_total + annual_total, 2)


# =========================
# Response models
# =========================

class AdminOverviewResponse(BaseModel):
    total_users: int
    active_users_30d: int
    premium_subscribers: int
    meals_logged_today: int
    new_users_this_month: int
    active_users_change_pct: float
    mrr: float
    meals_change_pct: float


class AdminGrowthItemResponse(BaseModel):
    month: str
    total: int
    premium: int


class SubscriptionSplitItemResponse(BaseModel):
    label: str
    pct: float
    color: str
    count: int


class AdminSubscriptionsResponse(BaseModel):
    freemium: SubscriptionSplitItemResponse
    premium: SubscriptionSplitItemResponse
    annual: SubscriptionSplitItemResponse
    mrr: float
    new_this_month: int
    cancellations: int


# =========================
# Endpoints
# =========================

@router.get(
    "/overview",
    response_model=AdminOverviewResponse,
    status_code=status.HTTP_200_OK
)
async def get_admin_overview(
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    now = sg_now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    yesterday_start = today_start - timedelta(days=1)

    month_start = get_month_start(now)
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)

    all_users = db.exec(select(user)).all()
    subscriptions = db.exec(select(user_subscription)).all()

    end_users = [u for u in all_users if is_end_user_role(u.role)]
    end_user_ids = {u.user_id for u in end_users}

    # Only freemium and premium end users are included in dashboard user totals.
    total_users = len(end_users)

    # Premium subscribers include both monthly and annual premium users.
    premium_subscribers = sum(
        1 for u in end_users
        if u.role == UserRole.premium
    )

    # Frontend expects this to represent newly started premium subscriptions this month.
    new_user_ids_this_month = {
        s.user_id
        for s in subscriptions
        if s.start_at >= month_start
    }
    new_this_month = len(new_user_ids_this_month)

    meals_logged_today = len(
        db.exec(
            select(meal).where(
                meal.consumed_at >= today_start,
                meal.consumed_at < tomorrow_start
            )
        ).all()
    )

    meals_logged_yesterday = len(
        db.exec(
            select(meal).where(
                meal.consumed_at >= yesterday_start,
                meal.consumed_at < today_start
            )
        ).all()
    )

    current_active_user_ids = {
        m.user_id
        for m in db.exec(
            select(meal).where(
                meal.consumed_at >= thirty_days_ago,
                meal.consumed_at < now
            )
        ).all()
        if m.user_id in end_user_ids
    }

    previous_active_user_ids = {
        m.user_id
        for m in db.exec(
            select(meal).where(
                meal.consumed_at >= sixty_days_ago,
                meal.consumed_at < thirty_days_ago
            )
        ).all()
        if m.user_id in end_user_ids
    }

    active_users_30d = len(current_active_user_ids)
    previous_active_users_30d = len(previous_active_user_ids)

    active_users_change_pct = percentage_change(
        active_users_30d,
        previous_active_users_30d
    )

    meals_change_pct = percentage_change(
        meals_logged_today,
        meals_logged_yesterday
    )

    mrr = calculate_mrr(subscriptions)

    return AdminOverviewResponse(
        total_users=total_users,
        active_users_30d=active_users_30d,
        premium_subscribers=premium_subscribers,
        meals_logged_today=meals_logged_today,
        new_users_this_month=new_users_this_month,
        active_users_change_pct=active_users_change_pct,
        mrr=mrr,
        meals_change_pct=meals_change_pct
    )


@router.get(
    "/growth",
    response_model=list[AdminGrowthItemResponse],
    status_code=status.HTTP_200_OK
)
async def get_admin_growth(
    db: db_dependency,
    current_user: user_dependency,
    months: int = 6
):
    require_admin(current_user)

    if months < 1 or months > 24:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="months must be between 1 and 24"
        )

    now = sg_now()
    current_month_start = get_month_start(now)
    first_month_start = add_months(current_month_start, -(months - 1))

    all_users = db.exec(select(user)).all()
    all_subscriptions = db.exec(select(user_subscription)).all()

    results = []
    for i in range(months):
        month_start = add_months(first_month_start, i)
        next_month_start = add_months(month_start, 1)
        
        total_count = sum(
            1 for u in all_users
            if is_end_user_role(u.role) and u.created_at < next_month_start
        )

        premium_user_ids = {
            s.user_id
            for s in all_subscriptions
            if s.start_at < next_month_start
            and (
                s.status == SubscriptionStatus.active
                or (
                    s.end_at is not None
                    and s.end_at > month_start
                )
            )
        }

        premium_count = len(premium_user_ids)

        results.append(
            AdminGrowthItemResponse(
                month=month_abbr[month_start.month],
                total=total_count,
                premium=premium_count
            )
        )

    return results


@router.get(
    "/subscriptions",
    response_model=AdminSubscriptionsResponse,
    status_code=status.HTTP_200_OK
)
async def get_admin_subscriptions(
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    now = sg_now()
    month_start = get_month_start(now)

    all_users = db.exec(select(user)).all()
    subscriptions = db.exec(select(user_subscription)).all()

    end_users = [u for u in all_users if is_end_user_role(u.role)]
    total_users = len(end_users)

    active_subscriptions = [
        s for s in subscriptions
        if s.status == SubscriptionStatus.active
    ]

    active_monthly_subscriptions = [
        s for s in active_subscriptions
        if s.plan == SubscriptionPlan.monthly
    ]

    active_annual_subscriptions = [
        s for s in active_subscriptions
        if s.plan == SubscriptionPlan.annual
    ]

    freemium_count = sum(1 for u in end_users if u.role == UserRole.freemium)
    premium_monthly_count = len(active_monthly_subscriptions)
    annual_count = len(active_annual_subscriptions)

    # Frontend expects this to represent newly started premium subscriptions this month.
    new_user_ids_this_month = {
        s.user_id
        for s in subscriptions
        if s.start_at >= month_start
    }
    new_this_month = len(new_user_ids_this_month)

    cancellations = sum(
        1 for s in subscriptions
        if s.status == SubscriptionStatus.cancelled
        and s.cancelled_at is not None
        and s.cancelled_at >= month_start
    )

    mrr = calculate_mrr(subscriptions)

    def pct(count: int) -> float:
        if total_users == 0:
            return 0.0
        return round((count / total_users) * 100, 1)

    return AdminSubscriptionsResponse(
        freemium=SubscriptionSplitItemResponse(
            label="Freemium",
            pct=pct(freemium_count),
            color="#d1d5db",
            count=freemium_count
        ),
        premium=SubscriptionSplitItemResponse(
            label="Premium",
            pct=pct(premium_monthly_count),
            color="#10b981",
            count=premium_monthly_count
        ),
        annual=SubscriptionSplitItemResponse(
            label="Annual",
            pct=pct(annual_count),
            color="#6ee7b7",
            count=annual_count
        ),
        mrr=mrr,
        new_this_month=new_this_month,
        cancellations=cancellations
    )