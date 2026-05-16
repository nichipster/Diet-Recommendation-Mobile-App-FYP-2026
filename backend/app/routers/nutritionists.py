from datetime import datetime, date
from zoneinfo import ZoneInfo
import json

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import (
    user,
    UserRole,
    nutritionist_profile,
    nutritionist_availability_slot,
    booking,
)

router = APIRouter(prefix="/nutritionists", tags=["Nutritionists"])


def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))


def get_current_db_user(db: db_dependency, current_user: user_dependency) -> user:
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    db_user = db.exec(select(user).where(user.user_id == int(current_user["id"]))).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


def require_nutritionist_owner_or_admin(db_user: user, nutritionist_id: int) -> None:
    if db_user.role == UserRole.admin:
        return
    if db_user.role == UserRole.nutritionist and db_user.user_id == nutritionist_id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nutritionist access required")


def initials(first_name: str, last_name: str) -> str:
    value = f"{first_name[:1]}{last_name[:1]}".upper()
    return value or "NT"


def avatar_color(user_id: int) -> str:
    palette = ["#10b981", "#3b82f6", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6"]
    return palette[user_id % len(palette)]


def parse_json_list(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


class NutritionistResponse(BaseModel):
    id: int
    initials: str
    avatarColor: str
    name: str
    specialisation: str
    credentials: str
    rating: float
    reviews: int
    bio: str
    tags: list[str]
    tip: str
    diaryFeedback: str | None = None
    review: dict | None = None
    filters: list[str]
    testimonial: str


class SlotSaveRequest(BaseModel):
    slots: dict[str, list[str]]


class ProfileUpdateRequest(BaseModel):
    """Payload for a nutritionist updating their own public-facing profile."""
    bio: str | None = None
    specialisation: str | None = None
    credentials: str | None = None
    tip: str | None = None
    testimonial: str | None = None
    tags: list[str] | None = None
    filters: list[str] | None = None
    diary_feedback: str | None = None


def build_nutritionist_response(db: db_dependency, db_user: user, profile: nutritionist_profile | None) -> NutritionistResponse:
    full_name = f"{db_user.first_name} {db_user.last_name}".strip()

    completed_bookings = db.exec(
        select(booking).where(
            booking.nutritionist_id == db_user.user_id,
            booking.rating != None,
        )
    ).all()

    reviews = len(completed_bookings)
    rating = round(sum(b.rating or 0 for b in completed_bookings) / reviews, 1) if reviews else 0.0
    latest_review = next((b for b in sorted(completed_bookings, key=lambda x: x.updated_at, reverse=True) if b.review_text), None)

    return NutritionistResponse(
        id=db_user.user_id,
        initials=initials(db_user.first_name, db_user.last_name),
        avatarColor=avatar_color(db_user.user_id),
        name=full_name,
        specialisation=profile.specialisation if profile else "General Nutrition",
        credentials=profile.credentials if profile else "Registered Dietitian",
        rating=rating,
        reviews=reviews,
        bio=profile.bio if profile else "",
        tags=parse_json_list(profile.tags if profile else None),
        tip=profile.tip if profile else "",
        diaryFeedback=profile.diary_feedback if profile else None,
        review={"stars": latest_review.rating, "text": latest_review.review_text} if latest_review else None,
        filters=parse_json_list(profile.filters if profile else None),
        testimonial=profile.testimonial if profile else "",
    )


@router.patch("/{nutritionist_id}/profile", response_model=NutritionistResponse, status_code=status.HTTP_200_OK)
async def update_nutritionist_profile(
    nutritionist_id: int,
    request: ProfileUpdateRequest,
    db: db_dependency,
    current_user: user_dependency,
):
    """Update a nutritionist's public profile (bio, specialisation, credentials, tip, testimonial).

    Args:
        nutritionist_id (int): ID of the nutritionist to update.
        request (ProfileUpdateRequest): Fields to update (all optional, None means no-op).
        db (db_dependency): Database session.
        current_user (user_dependency): Authenticated user (must own the profile or be admin).

    Returns:
        NutritionistResponse: Updated nutritionist profile.
    """
    db_user = get_current_db_user(db, current_user)
    require_nutritionist_owner_or_admin(db_user, nutritionist_id)

    nutritionist = db.exec(
        select(user).where(user.user_id == nutritionist_id, user.role == UserRole.nutritionist)
    ).first()
    if nutritionist is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nutritionist not found")

    profile = db.exec(
        select(nutritionist_profile).where(nutritionist_profile.user_id == nutritionist_id)
    ).first()
    if profile is None:
        # Create a new profile row if one doesn't exist yet
        profile = nutritionist_profile(user_id=nutritionist_id)
        db.add(profile)
        db.flush()  # give the profile a PK before updating fields

    if request.bio is not None:
        profile.bio = request.bio.strip()
    if request.specialisation is not None:
        profile.specialisation = request.specialisation.strip()
    if request.credentials is not None:
        profile.credentials = request.credentials.strip()
    if request.tip is not None:
        profile.tip = request.tip.strip()
    if request.testimonial is not None:
        profile.testimonial = request.testimonial.strip()
    if request.tags is not None:
        profile.tags = json.dumps(request.tags)
    if request.filters is not None:
        profile.filters = json.dumps(request.filters)
    if request.diary_feedback is not None:
        profile.diary_feedback = request.diary_feedback.strip() or None

    profile.updated_at = sg_now()

    try:
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return build_nutritionist_response(db, nutritionist, profile)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=list[NutritionistResponse], status_code=status.HTTP_200_OK)
async def get_nutritionists(db: db_dependency, current_user: user_dependency):
    get_current_db_user(db, current_user)

    nutritionist_users = db.exec(
        select(user).where(user.role == UserRole.nutritionist).order_by(user.user_id.asc())
    ).all()

    results = []
    for u in nutritionist_users:
        profile = db.exec(select(nutritionist_profile).where(nutritionist_profile.user_id == u.user_id)).first()
        results.append(build_nutritionist_response(db, u, profile))
    return results


@router.get("/slots", response_model=dict[int, dict[str, list[str]]], status_code=status.HTTP_200_OK)
async def get_all_slots(db: db_dependency, current_user: user_dependency):
    get_current_db_user(db, current_user)

    slots = db.exec(select(nutritionist_availability_slot).order_by(nutritionist_availability_slot.slot_date.asc())).all()
    result: dict[int, dict[str, list[str]]] = {}
    for slot in slots:
        result.setdefault(slot.nutritionist_id, {}).setdefault(slot.slot_date.isoformat(), []).append(slot.slot_time)

    for nutritionist_slots in result.values():
        for slot_list in nutritionist_slots.values():
            slot_list.sort()
    return result


@router.post("/{nutritionist_id}/slots", response_model=dict[int, dict[str, list[str]]], status_code=status.HTTP_200_OK)
async def save_nutritionist_slots(
    nutritionist_id: int,
    request: SlotSaveRequest,
    db: db_dependency,
    current_user: user_dependency,
):
    db_user = get_current_db_user(db, current_user)
    require_nutritionist_owner_or_admin(db_user, nutritionist_id)

    nutritionist = db.exec(select(user).where(user.user_id == nutritionist_id, user.role == UserRole.nutritionist)).first()
    if nutritionist is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nutritionist not found")

    existing_slots = db.exec(
        select(nutritionist_availability_slot).where(nutritionist_availability_slot.nutritionist_id == nutritionist_id, 
        nutritionist_availability_slot.slot_date == slot_date,
        nutritionist_availability_slot.slot_time == slot_time,)
    ).first()

    try:
        for date_str, times in request.slots.items():
            slot_date = date.fromisoformat(date_str)

            for slot_time in sorted(set(times)):

                existing_slot = db.exec(
                    select(nutritionist_availability_slot).where(
                        nutritionist_availability_slot.nutritionist_id == nutritionist_id,
                        nutritionist_availability_slot.slot_date == slot_date,
                        nutritionist_availability_slot.slot_time == slot_time,
                    )
                ).first()

                if existing_slot is None:
                    db.add(
                        nutritionist_availability_slot(
                            nutritionist_id=nutritionist_id,
                            slot_date=slot_date,
                            slot_time=slot_time,
                        )
                    )
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return await get_all_slots(db, current_user)
