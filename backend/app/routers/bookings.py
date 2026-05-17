from datetime import datetime, date
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, UserRole, booking, BookingStatus, chat

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))


def get_current_db_user(db: db_dependency, current_user: user_dependency) -> user:
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    db_user = db.exec(select(user).where(user.user_id == int(current_user["id"]))).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


def get_initials(db_user: user) -> str:
    return f"{db_user.first_name[:1]}{db_user.last_name[:1]}".upper() or "U"


def full_name(db_user: user) -> str:
    return f"{db_user.first_name} {db_user.last_name}".strip()


class BookingCreateRequest(BaseModel):
    userId: str | None = None
    user: str | None = None
    initials: str | None = None
    date: date
    time: str = Field(min_length=5, max_length=5)
    status: BookingStatus = BookingStatus.pending
    topic: str = Field(min_length=1)
    nutritionist: str | None = None
    nutritionistId: int | None = None
    rating: int | None = None
    reviewText: str | None = None


class BookingStatusRequest(BaseModel):
    status: BookingStatus


class BookingReviewRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    reviewText: str = Field(min_length=1)


class BookingResponse(BaseModel):
    id: int
    userId: str
    user: str
    initials: str
    date: str
    time: str
    status: BookingStatus
    topic: str
    nutritionist: str
    rating: int | None = None
    reviewText: str | None = None


def find_nutritionist(db: db_dependency, request: BookingCreateRequest) -> user:
    if request.nutritionistId is not None:
        result = db.exec(select(user).where(user.user_id == request.nutritionistId, user.role == UserRole.nutritionist)).first()
        if result:
            return result

    if request.nutritionist:
        nutritionists = db.exec(select(user).where(user.role == UserRole.nutritionist)).all()
        for n in nutritionists:
            if full_name(n).lower() == request.nutritionist.strip().lower():
                return n

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nutritionist not found")


def build_booking_response(db: db_dependency, item: booking) -> BookingResponse:
    db_user = db.exec(select(user).where(user.user_id == item.user_id)).first()
    nutritionist = db.exec(select(user).where(user.user_id == item.nutritionist_id)).first()

    if db_user is None or nutritionist is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking user not found")

    return BookingResponse(
        id=item.booking_id,
        userId=str(db_user.user_id),
        user=full_name(db_user),
        initials=get_initials(db_user),
        date=item.booking_date.isoformat(),
        time=item.booking_time,
        status=item.status,
        topic=item.topic,
        nutritionist=full_name(nutritionist),
        rating=item.rating,
        reviewText=item.review_text,
    )


def get_booking_or_404(db: db_dependency, booking_id: int) -> booking:
    item = db.exec(select(booking).where(booking.booking_id == booking_id)).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return item


def ensure_booking_access(db_user: user, item: booking) -> None:
    if db_user.role == UserRole.admin:
        return
    if db_user.user_id in {item.user_id, item.nutritionist_id}:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Booking access denied")


@router.get("", response_model=list[BookingResponse], status_code=status.HTTP_200_OK)
async def get_bookings(db: db_dependency, current_user: user_dependency):
    db_user = get_current_db_user(db, current_user)

    stmt = select(booking).order_by(booking.booking_date.desc(), booking.booking_time.desc())
    if db_user.role == UserRole.nutritionist:
        stmt = stmt.where(booking.nutritionist_id == db_user.user_id)
    elif db_user.role != UserRole.admin:
        stmt = stmt.where(booking.user_id == db_user.user_id)

    items = db.exec(stmt).all()
    return [build_booking_response(db, item) for item in items]


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(request: BookingCreateRequest, db: db_dependency, current_user: user_dependency):
    db_user = get_current_db_user(db, current_user)
    nutritionist = find_nutritionist(db, request)

    client_id = int(request.userId) if request.userId and db_user.role in {UserRole.admin, UserRole.nutritionist} else db_user.user_id

    client = db.exec(select(user).where(user.user_id == client_id)).first()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client user not found")

    existing_booking = db.exec(
        select(booking).where(
            booking.nutritionist_id == nutritionist.user_id,
            booking.booking_date == request.date,
            booking.booking_time == request.time,
            booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
        )
    ).first()

    if existing_booking is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot is already booked"
        )

    new_booking = booking(
        user_id=client.user_id,
        nutritionist_id=nutritionist.user_id,
        booking_date=request.date,
        booking_time=request.time,
        status=request.status,
        topic=request.topic.strip(),
        rating=request.rating,
        review_text=request.reviewText,
    )

    try:
        db.add(new_booking)
        db.commit()
        db.refresh(new_booking)

        existing_chat = db.exec(
            select(chat).where(chat.user_id == client.user_id, chat.nutritionist_id == nutritionist.user_id)
        ).first()
        if existing_chat is None:
            db.add(chat(booking_id=new_booking.booking_id, user_id=client.user_id, nutritionist_id=nutritionist.user_id))
            db.commit()

        return build_booking_response(db, new_booking)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{booking_id}/status", response_model=BookingResponse, status_code=status.HTTP_200_OK)
async def update_booking_status(booking_id: int, request: BookingStatusRequest, db: db_dependency, current_user: user_dependency):
    db_user = get_current_db_user(db, current_user)
    item = get_booking_or_404(db, booking_id)
    ensure_booking_access(db_user, item)

    item.status = request.status
    item.updated_at = sg_now()

    try:
        db.add(item)
        db.commit()
        db.refresh(item)
        return build_booking_response(db, item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{booking_id}/review", response_model=BookingResponse, status_code=status.HTTP_200_OK)
async def submit_booking_review(booking_id: int, request: BookingReviewRequest, db: db_dependency, current_user: user_dependency):
    db_user = get_current_db_user(db, current_user)
    item = get_booking_or_404(db, booking_id)

    if db_user.role != UserRole.admin and db_user.user_id != item.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the client can review this booking")

    item.rating = request.rating
    item.review_text = request.reviewText.strip()
    item.updated_at = sg_now()

    try:
        db.add(item)
        db.commit()
        db.refresh(item)
        return build_booking_response(db, item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
