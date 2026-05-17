from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, UserRole, chat, chat_message, booking, BookingStatus

router = APIRouter(prefix="/chats", tags=["Chats"])


def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))


def format_sg_time(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(ZoneInfo("Asia/Singapore")).strftime("%H:%M")


def get_current_db_user(db: db_dependency, current_user: user_dependency) -> user:
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    db_user = db.exec(select(user).where(user.user_id == int(current_user["id"]))).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


def full_name(db_user: user) -> str:
    return f"{db_user.first_name} {db_user.last_name}".strip()


class MessageCreateRequest(BaseModel):
    text: str = Field(min_length=1)


class MessageResponse(BaseModel):
    id: str
    text: str
    sender: str
    senderId: str
    time: str
    read: bool


class ChatResponse(BaseModel):
    id: str
    name: str
    messages: list[MessageResponse]
    archived: bool
    isTyping: bool = False
    reported: bool = False
    reportCount: int = 0


def get_chat_or_404(db: db_dependency, chat_id: int) -> chat:
    item = db.exec(select(chat).where(chat.chat_id == chat_id)).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    return item


def ensure_chat_access(db: db_dependency, db_user: user, item: chat) -> None:
    if db_user.role == UserRole.admin:
        return
    
    if db_user.user_id not in {item.user_id, item.nutritionist_id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chat access denied")

    active_booking = db.exec(
        select(booking).where(
            booking.user_id == item.user_id,
            booking.nutritionist_id == item.nutritionist_id,
            booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
        )
    ).first()

    if active_booking is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chat is only available for active bookings"
        )


def build_chat_response(db: db_dependency, db_user: user, item: chat) -> ChatResponse:
    client = db.exec(select(user).where(user.user_id == item.user_id)).first()
    nutritionist = db.exec(select(user).where(user.user_id == item.nutritionist_id)).first()
    if client is None or nutritionist is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat user not found")

    other_user = client if db_user.role == UserRole.nutritionist else nutritionist
    messages = db.exec(select(chat_message).where(chat_message.chat_id == item.chat_id).order_by(chat_message.created_at.asc())).all()

    return ChatResponse(
        id=str(item.chat_id),
        name=full_name(other_user),
        archived=item.archived,
        isTyping=False,
        reported=item.reported,
        reportCount=item.report_count,
        messages=[
            MessageResponse(
                id=str(m.message_id),
                text=m.text,
                sender="me" if m.sender_id == db_user.user_id else "recipient",
                senderId=str(m.sender_id), 
                time=format_sg_time(m.created_at),
                read=m.read,
            )
            for m in messages
        ],
    )


@router.get("", response_model=list[ChatResponse], status_code=status.HTTP_200_OK)
async def get_chats(db: db_dependency, current_user: user_dependency):
    db_user = get_current_db_user(db, current_user)

    stmt = select(chat).order_by(chat.updated_at.desc())
    if db_user.role == UserRole.nutritionist:
        stmt = stmt.where(chat.nutritionist_id == db_user.user_id)
    elif db_user.role != UserRole.admin:
        stmt = stmt.where(chat.user_id == db_user.user_id)

    items = db.exec(stmt).all()
    return [build_chat_response(db, db_user, item) for item in items]


@router.post("/{chat_id}/messages", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
async def send_message(chat_id: int, request: MessageCreateRequest, db: db_dependency, current_user: user_dependency):
    db_user = get_current_db_user(db, current_user)
    item = get_chat_or_404(db, chat_id)
    ensure_chat_access(db, db_user, item)

    item.archived = False
    item.updated_at = sg_now()
    new_message = chat_message(chat_id=chat_id, sender_id=db_user.user_id, text=request.text.strip(), read=True)

    try:
        db.add(new_message)
        db.add(item)
        db.commit()
        db.refresh(item)
        return build_chat_response(db, db_user, item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{chat_id}/archive", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def archive_chat(chat_id: int, db: db_dependency, current_user: user_dependency):
    return await set_archive_status(chat_id, True, db, current_user)


@router.patch("/{chat_id}/unarchive", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def unarchive_chat(chat_id: int, db: db_dependency, current_user: user_dependency):
    return await set_archive_status(chat_id, False, db, current_user)


async def set_archive_status(chat_id: int, archived: bool, db: db_dependency, current_user: user_dependency):
    db_user = get_current_db_user(db, current_user)
    item = get_chat_or_404(db, chat_id)
    ensure_chat_access(db, db_user, item)
    item.archived = archived
    item.updated_at = sg_now()
    try:
        db.add(item)
        db.commit()
        db.refresh(item)
        return build_chat_response(db, db_user, item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{chat_id}/read", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def mark_chat_as_read(chat_id: int, db: db_dependency, current_user: user_dependency):
    db_user = get_current_db_user(db, current_user)
    item = get_chat_or_404(db, chat_id)
    ensure_chat_access(db, db_user, item)

    messages = db.exec(select(chat_message).where(chat_message.chat_id == chat_id, chat_message.sender_id != db_user.user_id)).all()
    try:
        for message in messages:
            message.read = True
            db.add(message)
        db.commit()
        db.refresh(item)
        return build_chat_response(db, db_user, item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{chat_id}/report", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def report_user(chat_id: int, db: db_dependency, current_user: user_dependency):
    db_user = get_current_db_user(db, current_user)
    item = get_chat_or_404(db, chat_id)
    ensure_chat_access(db, db_user, item)

    item.reported = True
    item.report_count += 1
    item.updated_at = sg_now()
    try:
        db.add(item)
        db.commit()
        db.refresh(item)
        return build_chat_response(db, db_user, item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
