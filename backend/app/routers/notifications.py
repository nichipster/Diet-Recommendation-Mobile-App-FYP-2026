from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import (
    user,
    push_token,
    notification_history,
    NotificationSegment,
    UserRole,
)
from ..services.push_notification_service import send_expo_push_notifications


router = APIRouter(
    prefix="",
    tags=["Notifications"]
)


def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))


def get_current_db_user(
    db: db_dependency,
    current_user: user_dependency
) -> user:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    db_user = db.exec(
        select(user).where(user.user_id == int(current_user["id"]))
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return db_user


def require_admin(
    db: db_dependency,
    current_user: user_dependency
) -> user:
    db_user = get_current_db_user(db, current_user)

    if db_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return db_user


class RegisterPushTokenRequest(BaseModel):
    token: str = Field(min_length=1, max_length=255)


class MessageResponse(BaseModel):
    message: str


class SendNotificationRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=2000)
    segment: NotificationSegment


class SentNotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    segment: NotificationSegment
    sent_at: datetime
    recipient_count: int


def build_notification_response(
    db_notification: notification_history
) -> SentNotificationResponse:
    return SentNotificationResponse(
        id=db_notification.notification_id,
        title=db_notification.title,
        message=db_notification.message,
        segment=db_notification.segment,
        sent_at=db_notification.sent_at,
        recipient_count=db_notification.recipient_count
    )


@router.post(
    "/notifications/register-token",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK
)
async def register_push_token(
    request: RegisterPushTokenRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)
    normalized_token = request.token.strip()

    # If token already exists for any user, reassign/update it
    existing_token = db.exec(
        select(push_token).where(push_token.token == normalized_token)
    ).first()

    if existing_token is not None:
        existing_token.user_id = db_user.user_id
        existing_token.is_active = True
        existing_token.updated_at = sg_now()

        try:
            db.add(existing_token)
            db.commit()
            db.refresh(existing_token)
            return {"message": "Push token registered successfully"}
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    new_token = push_token(
        user_id=db_user.user_id,
        token=normalized_token,
        is_active=True
    )

    try:
        db.add(new_token)
        db.commit()
        db.refresh(new_token)
        return {"message": "Push token registered successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/admin/notifications/send",
    response_model=SentNotificationResponse,
    status_code=status.HTTP_200_OK
)
async def send_notification_to_segment(
    request: SendNotificationRequest,
    db: db_dependency,
    current_user: user_dependency
):
    admin_user = require_admin(db, current_user)

    base_query = select(user)

    if request.segment == NotificationSegment.premium:
        base_query = base_query.where(user.role == UserRole.premium)
    elif request.segment == NotificationSegment.freemium:
        base_query = base_query.where(user.role == UserRole.freemium)
    else:
        base_query = base_query.where(
            (user.role == UserRole.premium) | (user.role == UserRole.freemium)
        )

    recipient_users = db.exec(base_query).all()
    recipient_user_ids = [u.user_id for u in recipient_users]

    if not recipient_user_ids:
        new_history = notification_history(
            title=request.title.strip(),
            message=request.message.strip(),
            segment=request.segment,
            sent_at=sg_now(),
            recipient_count=0,
            created_by_user_id=admin_user.user_id
        )

        try:
            db.add(new_history)
            db.commit()
            db.refresh(new_history)
            return build_notification_response(new_history)
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    db_tokens = db.exec(
        select(push_token).where(
            push_token.user_id.in_(recipient_user_ids),
            push_token.is_active == True
        )
    ).all()

    unique_tokens = list({row.token for row in db_tokens})

    try:
        send_result = send_expo_push_notifications(
            tokens=unique_tokens,
            title=request.title.strip(),
            message=request.message.strip(),
            data={"segment": request.segment.value}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Expo push send failed: {str(e)}"
        )

    # Optional: deactivate failed tokens later if you implement receipt check
    new_history = notification_history(
        title=request.title.strip(),
        message=request.message.strip(),
        segment=request.segment,
        sent_at=sg_now(),
        recipient_count=len(unique_tokens),
        created_by_user_id=admin_user.user_id
    )

    try:
        db.add(new_history)
        db.commit()
        db.refresh(new_history)
        return build_notification_response(new_history)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/admin/notifications/history",
    response_model=list[SentNotificationResponse],
    status_code=status.HTTP_200_OK
)
async def get_notification_history(
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(db, current_user)

    history = db.exec(
        select(notification_history)
        .order_by(notification_history.sent_at.desc())
    ).all()

    return [build_notification_response(item) for item in history]