from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select, func

from ..dependencies import db_dependency, user_dependency
from ..models import (
    user,
    user_profile,
    dietary_goal,
    meal,
    app_event_log,
    AppFeature,
    FoodSource,
    UserRole,
)

router = APIRouter(prefix="/admin/stats/performance", tags=["Admin Performance"])

SG_TZ = ZoneInfo("Asia/Singapore")
FEATURE_ORDER = [
    AppFeature.meal_logger,
    AppFeature.goals,
    AppFeature.recommend_meal,
    AppFeature.consult,
    AppFeature.progress_report,
    AppFeature.my_meals,
]
MEAL_TIME_SLOTS = [("6am", 6), ("8am", 8), ("10am", 10), ("12pm", 12), ("2pm", 14), ("6pm", 18), ("8pm", 20), ("10pm", 22)]


def sg_now() -> datetime:
    return datetime.now(SG_TZ)


def require_admin(current_user: user_dependency) -> None:
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def pct(part: int | float, total: int | float) -> float:
    if not total:
        return 0.0
    return round((part / total) * 100, 1)


def start_of_day(dt: datetime) -> datetime:
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def end_user_ids(db: db_dependency) -> set[int]:
    rows = db.exec(select(user).where(user.role.in_([UserRole.freemium, UserRole.premium]))).all()
    return {u.user_id for u in rows if u.user_id is not None}


def get_feature_usage_pct(db: db_dependency, feature: AppFeature, since: datetime, active_ids: set[int]) -> float:
    if not active_ids:
        return 0.0

    if feature == AppFeature.meal_logger:
        used = {m.user_id for m in db.exec(select(meal).where(meal.consumed_at >= since)).all() if m.user_id in active_ids}
        return pct(len(used), len(active_ids))

    event_user_ids = {
        e.user_id for e in db.exec(
            select(app_event_log).where(app_event_log.feature == feature, app_event_log.created_at >= since)
        ).all()
        if e.user_id in active_ids
    }
    return pct(len(event_user_ids), len(active_ids))


class PerformanceOverviewResponse(BaseModel):
    dau_mau_ratio: float
    avg_daily_usage_mins: float


class FeatureUsageResponse(BaseModel):
    feature: str
    usage_pct: float


class MealTimeResponse(BaseModel):
    hour: str
    pct: float


class FunnelResponse(BaseModel):
    step: str
    count: int
    pct: float
    drop: float | None


class TopFoodResponse(BaseModel):
    rank: int
    name: str
    emoji: str
    emoji_bg: str
    logs: int


class InsightResponse(BaseModel):
    type: Literal["success", "warning", "danger"]
    title: str
    text: str


@router.get("/overview", response_model=PerformanceOverviewResponse, status_code=status.HTTP_200_OK)
async def get_performance_overview(db: db_dependency, current_user: user_dependency):
    require_admin(current_user)
    now = sg_now()
    today = start_of_day(now)
    thirty_days_ago = now - timedelta(days=30)

    ids = end_user_ids(db)
    daily_active = {m.user_id for m in db.exec(select(meal).where(meal.consumed_at >= today)).all() if m.user_id in ids}
    monthly_active = {m.user_id for m in db.exec(select(meal).where(meal.consumed_at >= thirty_days_ago)).all() if m.user_id in ids}
    dau_mau_ratio = pct(len(daily_active), len(monthly_active))

    events = db.exec(select(app_event_log).where(app_event_log.created_at >= thirty_days_ago)).all()
    daily_duration: dict[datetime.date, int] = {}
    for event in events:
        daily_duration[event.created_at.date()] = daily_duration.get(event.created_at.date(), 0) + event.duration_seconds

    avg_daily_usage_mins = 0.0
    if daily_duration:
        avg_daily_usage_mins = round((sum(daily_duration.values()) / len(daily_duration)) / 60, 1)

    return PerformanceOverviewResponse(dau_mau_ratio=dau_mau_ratio, avg_daily_usage_mins=avg_daily_usage_mins)


@router.get("/features", response_model=list[FeatureUsageResponse], status_code=status.HTTP_200_OK)
async def get_feature_usage(db: db_dependency, current_user: user_dependency, days: int = 30):
    require_admin(current_user)
    if days < 1 or days > 365:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="days must be between 1 and 365")

    since = sg_now() - timedelta(days=days)
    ids = end_user_ids(db)
    active_ids = {m.user_id for m in db.exec(select(meal).where(meal.consumed_at >= since)).all() if m.user_id in ids}
    if not active_ids:
        active_ids = ids

    return [FeatureUsageResponse(feature=f.value, usage_pct=get_feature_usage_pct(db, f, since, active_ids)) for f in FEATURE_ORDER]


@router.get("/meal-times", response_model=list[MealTimeResponse], status_code=status.HTTP_200_OK)
async def get_meal_times(db: db_dependency, current_user: user_dependency):
    require_admin(current_user)
    today = start_of_day(sg_now())
    month_start = today.replace(day=1)
    meals = db.exec(select(meal).where(meal.consumed_at >= month_start)).all()
    total = len(meals)

    results: list[MealTimeResponse] = []
    for label, hour in MEAL_TIME_SLOTS:
        count = sum(1 for m in meals if m.consumed_at.hour == hour)
        results.append(MealTimeResponse(hour=label, pct=pct(count, total)))
    return results


@router.get("/funnel", response_model=list[FunnelResponse], status_code=status.HTTP_200_OK)
async def get_onboarding_funnel(db: db_dependency, current_user: user_dependency):
    require_admin(current_user)
    now = sg_now()
    users = db.exec(select(user).where(user.role.in_([UserRole.freemium, UserRole.premium]))).all()
    signed_up_ids = {u.user_id for u in users if u.user_id is not None}
    verified_ids = {u.user_id for u in users if u.user_id is not None and u.email_verified}
    surveyed_ids = {p.user_id for p in db.exec(select(user_profile)).all()}
    goal_ids = {g.user_id for g in db.exec(select(dietary_goal).where(dietary_goal.is_active == True)).all()}
    first_meal_ids = {m.user_id for m in db.exec(select(meal)).all()}

    active_after_7d_ids = set()
    for u in users:
        if u.user_id is None:
            continue
        after_7d = u.created_at + timedelta(days=7)
        found = db.exec(select(meal).where(meal.user_id == u.user_id, meal.consumed_at >= after_7d, meal.consumed_at <= now)).first()
        if found is not None:
            active_after_7d_ids.add(u.user_id)

    steps = [
        ("Signed up", signed_up_ids, None),
        ("Verified email", verified_ids, None),
        ("Completed survey", surveyed_ids, "drop"),
        ("Set first goal", goal_ids, "drop"),
        ("Logged first meal", first_meal_ids, "drop"),
        ("Active after 7d", active_after_7d_ids, "drop"),
    ]

    signed_up_count = len(signed_up_ids)
    previous_count = signed_up_count
    response: list[FunnelResponse] = []
    for index, (label, ids, drop_mode) in enumerate(steps):
        count = len(ids)
        step_pct = 100.0 if index == 0 else pct(count, signed_up_count)
        drop = None if drop_mode is None else round(step_pct - pct(previous_count, signed_up_count), 1)
        response.append(FunnelResponse(step=label, count=count, pct=step_pct, drop=drop))
        previous_count = count
    return response


@router.get("/top-foods", response_model=list[TopFoodResponse], status_code=status.HTTP_200_OK)
async def get_top_foods(db: db_dependency, current_user: user_dependency):
    require_admin(current_user)
    now = sg_now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    rows = db.exec(
        select(meal.meal_name, func.count(meal.meal_id))
        .where(meal.consumed_at >= month_start)
        .group_by(meal.meal_name)
        .order_by(func.count(meal.meal_id).desc())
        .limit(10)
    ).all()

    palette = ["#dcfce7", "#dbeafe", "#ffedd5", "#f3e8ff", "#fee2e2"]
    emojis = ["🍽️", "🥗", "🍚", "🍜", "🥣"]
    return [
        TopFoodResponse(rank=i + 1, name=name, emoji=emojis[i % len(emojis)], emoji_bg=palette[i % len(palette)], logs=count)
        for i, (name, count) in enumerate(rows)
    ]


@router.get("/insights", response_model=list[InsightResponse], status_code=status.HTTP_200_OK)
async def get_performance_insights(db: db_dependency, current_user: user_dependency):
    require_admin(current_user)
    overview = await get_performance_overview(db, current_user)
    features = await get_feature_usage(db, current_user, days=30)
    funnel = await get_onboarding_funnel(db, current_user)

    feature_map = {item.feature: item.usage_pct for item in features}
    funnel_map = {item.step: item for item in funnel}
    insights: list[InsightResponse] = []

    if feature_map.get("Meal Logger", 0) > 80:
        insights.append(InsightResponse(type="success", title="Meal logging is strong", text="More than 80% of active users used the meal logger."))
    if feature_map.get("Consult", 0) < 40:
        insights.append(InsightResponse(type="warning", title="Consult usage is low", text="Less than 40% of active users visited the nutritionist consult page."))
    if feature_map.get("My Meals", 0) < 20:
        insights.append(InsightResponse(type="warning", title="My Meals usage is low", text="Less than 20% of active users used the personal meals feature."))

    logged_first_meal = funnel_map.get("Logged first meal")
    if logged_first_meal and logged_first_meal.drop is not None and abs(logged_first_meal.drop) > 10:
        insights.append(InsightResponse(type="danger", title="First meal logging drop-off", text="More than 10% of users are lost before logging their first meal."))
    if overview.dau_mau_ratio < 50:
        insights.append(InsightResponse(type="danger", title="DAU/MAU is below target", text="The DAU/MAU ratio is below 50%."))
    if overview.avg_daily_usage_mins > 30:
        insights.append(InsightResponse(type="success", title="Daily usage time is healthy", text="Average daily usage is above 30 minutes."))

    return insights
