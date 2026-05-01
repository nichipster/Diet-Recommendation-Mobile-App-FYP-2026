from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
from typing import Literal
import csv
import hashlib
import json
import secrets

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import (
    user_profile,
    user_preferences,
    dietary_goal,
    meal,
    custom_meal,
    export_history,
    ExportRange,
    ExportFormat,
)

router = APIRouter(prefix="/admin/export", tags=["Admin Export"])
SG_TZ = ZoneInfo("Asia/Singapore")
EXPORT_DIR = Path("private_exports")
EXPORT_DIR.mkdir(parents=True, exist_ok=True)


def sg_now() -> datetime:
    return datetime.now(SG_TZ)


def require_admin(current_user: user_dependency) -> None:
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def range_start(export_range: ExportRange) -> datetime | None:
    now = sg_now()
    if export_range == ExportRange.thirty_days:
        return now - timedelta(days=30)
    if export_range == ExportRange.three_months:
        return now - timedelta(days=90)
    if export_range == ExportRange.six_months:
        return now - timedelta(days=180)
    return None


def anonymous_user_id(user_id: int) -> str:
    salt = "nutritrack-export-v1"
    return hashlib.sha256(f"{salt}:{user_id}".encode()).hexdigest()[:16]


def dietary_preferences_text(prefs: user_preferences | None) -> str:
    if prefs is None:
        return ""
    values = []
    for label, flag in [
        ("vegetarian", prefs.is_vegetarian),
        ("vegan", prefs.is_vegan),
        ("halal", prefs.is_halal),
        ("gluten_free", prefs.is_gluten_free),
    ]:
        if flag:
            values.append(label)
    return ",".join(values)


def meal_time_of_day(dt: datetime) -> str:
    hour = dt.hour
    if 5 <= hour < 12:
        return "morning"
    if 12 <= hour < 17:
        return "afternoon"
    if 17 <= hour < 21:
        return "evening"
    return "night"


class GenerateExportRequest(BaseModel):
    range: ExportRange
    format: ExportFormat


class ExportRecordResponse(BaseModel):
    id: int
    filename: str
    range: str
    format: str
    records: int
    created_at: datetime
    download_url: str


EXPORT_FIELDS = [
    "anonymous_user_id",
    "dietary_preferences",
    "goal_type",
    "activity_level",
    "calorie_target",
    "protein_target",
    "carbs_target",
    "fats_target",
    "meal_name",
    "meal_calories",
    "meal_protein",
    "meal_carbs",
    "meal_fats",
    "meal_logged_at",
    "meal_rating",
    "meal_saved",
    "meal_time_of_day",
]


def build_download_url(token: str) -> str:
    return f"/admin/export/download/{token}"


def build_response(row: export_history) -> ExportRecordResponse:
    return ExportRecordResponse(
        id=row.export_id,
        filename=row.filename,
        range=row.export_range.value,
        format=row.export_format.value,
        records=row.records,
        created_at=row.created_at,
        download_url=build_download_url(row.token),
    )


@router.post("/generate", response_model=ExportRecordResponse, status_code=status.HTTP_201_CREATED)
async def generate_export(request: GenerateExportRequest, db: db_dependency, current_user: user_dependency):
    require_admin(current_user)
    since = range_start(request.range)

    query = select(meal)
    if since is not None:
        query = query.where(meal.consumed_at >= since)
    meals = db.exec(query.order_by(meal.consumed_at.desc())).all()

    rows: list[dict] = []
    for m in meals:
        profile = db.exec(select(user_profile).where(user_profile.user_id == m.user_id)).first()
        prefs = db.exec(select(user_preferences).where(user_preferences.user_id == m.user_id)).first()
        goal = db.exec(select(dietary_goal).where(dietary_goal.user_id == m.user_id, dietary_goal.is_active == True)).first()
        saved = bool(m.is_favorite)

        rows.append({
            "anonymous_user_id": anonymous_user_id(m.user_id),
            "dietary_preferences": dietary_preferences_text(prefs),
            "goal_type": goal.goal_type.value if goal else None,
            "activity_level": profile.activity_level.value if profile else None,
            "calorie_target": goal.daily_calorie_target if goal else None,
            "protein_target": goal.daily_protein_g if goal else None,
            "carbs_target": goal.daily_carb_g if goal else None,
            "fats_target": goal.daily_fat_g if goal else None,
            "meal_name": m.meal_name,
            "meal_calories": m.calories,
            "meal_protein": m.protein_g,
            "meal_carbs": m.carb_g,
            "meal_fats": m.fat_g,
            "meal_logged_at": m.consumed_at.isoformat(),
            "meal_rating": m.rating,
            "meal_saved": saved,
            "meal_time_of_day": meal_time_of_day(m.consumed_at),
        })

    token = secrets.token_urlsafe(24)
    timestamp = sg_now().strftime("%Y%m%d_%H%M%S")
    ext = "csv" if request.format == ExportFormat.csv else "json"
    filename = f"nutritrack_export_{request.range.value}_{timestamp}.{ext}"
    file_path = EXPORT_DIR / filename

    if request.format == ExportFormat.csv:
        with file_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=EXPORT_FIELDS)
            writer.writeheader()
            writer.writerows(rows)
    else:
        with file_path.open("w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)

    history = export_history(
        filename=filename,
        export_range=request.range,
        export_format=request.format,
        records=len(rows),
        file_path=str(file_path),
        token=token,
        expires_at=sg_now() + timedelta(hours=24),
        created_by_user_id=int(current_user["id"]),
    )

    try:
        db.add(history)
        db.commit()
        db.refresh(history)
        return build_response(history)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/history", response_model=list[ExportRecordResponse], status_code=status.HTTP_200_OK)
async def get_export_history(db: db_dependency, current_user: user_dependency):
    require_admin(current_user)
    rows = db.exec(select(export_history).order_by(export_history.created_at.desc())).all()
    return [build_response(row) for row in rows]


@router.get("/download/{token}", status_code=status.HTTP_200_OK)
async def download_export(token: str, db: db_dependency, current_user: user_dependency):
    require_admin(current_user)
    row = db.exec(select(export_history).where(export_history.token == token)).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export file not found")
    if sg_now() > row.expires_at:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Download link has expired")
    path = Path(row.file_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export file is missing")
    return FileResponse(path=path, filename=row.filename, media_type="application/octet-stream")
