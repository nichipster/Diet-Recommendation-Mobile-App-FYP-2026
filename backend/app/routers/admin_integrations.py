from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import time

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select, func

from ..dependencies import db_dependency, user_dependency
from ..models import spoonacular_api_log
from ..services.spoonacular_service import SpoonacularService

router = APIRouter(prefix="/admin/integrations/spoonacular", tags=["Admin Integrations"])
DAILY_LIMIT = 150
SG_TZ = ZoneInfo("Asia/Singapore")


def sg_now() -> datetime:
    return datetime.now(SG_TZ)


def require_admin(current_user: user_dependency) -> None:
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


class StatusResponse(BaseModel):
    connected: bool
    last_checked: str
    error_message: str | None


class UsageDayResponse(BaseModel):
    day: str
    calls: int


class UsageResponse(BaseModel):
    daily_limit: int
    daily_calls: list[UsageDayResponse]


class TopFoodCallResponse(BaseModel):
    rank: int
    name: str
    calls: int


class TestResponse(BaseModel):
    success: bool
    response_time_ms: int
    error: str | None


@router.get("/status", response_model=StatusResponse, status_code=status.HTTP_200_OK)
async def get_spoonacular_status(db: db_dependency, current_user: user_dependency):
    require_admin(current_user)
    latest = db.exec(select(spoonacular_api_log).order_by(spoonacular_api_log.created_at.desc())).first()
    if latest is None:
        return StatusResponse(connected=False, last_checked=sg_now().isoformat(), error_message="No Spoonacular API calls logged yet")
    return StatusResponse(connected=latest.success, last_checked=latest.created_at.isoformat(), error_message=latest.error_message)


@router.get("/usage", response_model=UsageResponse, status_code=status.HTTP_200_OK)
async def get_spoonacular_usage(db: db_dependency, current_user: user_dependency):
    require_admin(current_user)
    today = sg_now().date()
    daily_calls: list[UsageDayResponse] = []

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        start = datetime.combine(day, datetime.min.time()).replace(tzinfo=SG_TZ)
        end = start + timedelta(days=1)
        calls = len(db.exec(select(spoonacular_api_log).where(spoonacular_api_log.created_at >= start, spoonacular_api_log.created_at < end)).all())
        daily_calls.append(UsageDayResponse(day=day.strftime("%a"), calls=calls))

    return UsageResponse(daily_limit=DAILY_LIMIT, daily_calls=daily_calls)


@router.get("/top-foods", response_model=list[TopFoodCallResponse], status_code=status.HTTP_200_OK)
async def get_spoonacular_top_foods(db: db_dependency, current_user: user_dependency):
    require_admin(current_user)
    rows = db.exec(
        select(spoonacular_api_log.food_name, func.count(spoonacular_api_log.log_id))
        .where(spoonacular_api_log.food_name.is_not(None))
        .group_by(spoonacular_api_log.food_name)
        .order_by(func.count(spoonacular_api_log.log_id).desc())
        .limit(10)
    ).all()
    return [TopFoodCallResponse(rank=i + 1, name=name, calls=count) for i, (name, count) in enumerate(rows)]


@router.post("/test", response_model=TestResponse, status_code=status.HTTP_200_OK)
async def test_spoonacular_connection(db: db_dependency, current_user: user_dependency):
    require_admin(current_user)
    started = time.perf_counter()
    try:
        service = SpoonacularService(db=db)
        service.search_ingredients("apple", number=1)
        elapsed = int((time.perf_counter() - started) * 1000)
        return TestResponse(success=True, response_time_ms=elapsed, error=None)
    except Exception as e:
        elapsed = int((time.perf_counter() - started) * 1000)
        return TestResponse(success=False, response_time_ms=elapsed, error=str(e))
