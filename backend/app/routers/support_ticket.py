from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, support_ticket, SupportTicketStatus, UserRole


router = APIRouter(
    prefix="/support/tickets",
    tags=["Support Tickets"]
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


def get_ticket_or_404(
    db: db_dependency,
    ticket_id: int
) -> support_ticket:
    db_ticket = db.exec(
        select(support_ticket).where(support_ticket.ticket_id == ticket_id)
    ).first()

    if db_ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Support ticket not found"
        )

    return db_ticket


def get_initials(first_name: str, last_name: str) -> str:
    first = first_name[:1].upper() if first_name else ""
    last = last_name[:1].upper() if last_name else ""
    return f"{first}{last}" or "U"


def get_avatar_color(user_id: int) -> str:
    palette = [
        "#10b981",
        "#3b82f6",
        "#f97316",
        "#8b5cf6",
        "#ec4899",
        "#14b8a6",
        "#f59e0b",
        "#6366f1",
    ]
    return palette[user_id % len(palette)]


def map_user_role_for_frontend(role: UserRole) -> str:
    if role == UserRole.premium:
        return "premium"
    return "freemium"


class CreateSupportTicketRequest(BaseModel):
    category: str = Field(min_length=1, max_length=100)
    subject: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=3000)


class ReplySupportTicketRequest(BaseModel):
    admin_reply: str = Field(min_length=1, max_length=3000)
    status: SupportTicketStatus


class CloseSupportTicketRequest(BaseModel):
    status: SupportTicketStatus = SupportTicketStatus.resolved


class SupportTicketUserResponse(BaseModel):
    id: str
    subject: str
    description: str
    category: str
    status: str
    created_at: datetime
    admin_reply: Optional[str] = None


class SupportTicketAdminResponse(BaseModel):
    id: str
    user_name: str
    user_email: str
    user_role: str
    user_initials: str
    avatar_color: str
    subject: str
    description: str
    category: str
    status: str
    created_at: datetime
    admin_reply: Optional[str] = None


def build_user_ticket_response(ticket: support_ticket) -> SupportTicketUserResponse:
    return SupportTicketUserResponse(
        id=str(ticket.ticket_id),
        subject=ticket.subject,
        description=ticket.description,
        category=ticket.category,
        status=ticket.status.value,
        created_at=ticket.created_at,
        admin_reply=ticket.admin_reply
    )


def build_admin_ticket_response(
    ticket: support_ticket,
    db_user: user
) -> SupportTicketAdminResponse:
    return SupportTicketAdminResponse(
        id=str(ticket.ticket_id),
        user_name=f"{db_user.first_name} {db_user.last_name}".strip(),
        user_email=db_user.email,
        user_role=map_user_role_for_frontend(db_user.role),
        user_initials=get_initials(db_user.first_name, db_user.last_name),
        avatar_color=get_avatar_color(db_user.user_id),
        subject=ticket.subject,
        description=ticket.description,
        category=ticket.category,
        status=ticket.status.value,
        created_at=ticket.created_at,
        admin_reply=ticket.admin_reply
    )


@router.post(
    "",
    response_model=SupportTicketUserResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_support_ticket(
    request: CreateSupportTicketRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    new_ticket = support_ticket(
        user_id=db_user.user_id,
        category=request.category.strip(),
        subject=request.subject.strip(),
        description=request.description.strip(),
        status=SupportTicketStatus.open
    )

    try:
        db.add(new_ticket)
        db.commit()
        db.refresh(new_ticket)
        return build_user_ticket_response(new_ticket)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/me",
    response_model=list[SupportTicketUserResponse],
    status_code=status.HTTP_200_OK
)
async def get_my_support_tickets(
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    tickets = db.exec(
        select(support_ticket)
        .where(support_ticket.user_id == db_user.user_id)
        .order_by(support_ticket.created_at.desc())
    ).all()

    return [build_user_ticket_response(ticket) for ticket in tickets]


@router.get(
    "",
    response_model=list[SupportTicketAdminResponse],
    status_code=status.HTTP_200_OK
)
async def get_all_support_tickets(
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(db, current_user)

    tickets = db.exec(
        select(support_ticket).order_by(support_ticket.created_at.desc())
    ).all()

    results = []
    for ticket in tickets:
        db_user = db.exec(
            select(user).where(user.user_id == ticket.user_id)
        ).first()
        if db_user is None:
            continue
        results.append(build_admin_ticket_response(ticket, db_user))

    return results


@router.put(
    "/{ticket_id}/reply",
    response_model=SupportTicketAdminResponse,
    status_code=status.HTTP_200_OK
)
async def reply_to_support_ticket(
    ticket_id: int,
    request: ReplySupportTicketRequest,
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(db, current_user)

    if request.status not in {
        SupportTicketStatus.in_progress,
        SupportTicketStatus.resolved
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reply status must be 'In Progress' or 'Resolved'"
        )

    db_ticket = get_ticket_or_404(db, ticket_id)
    db_user = db.exec(
        select(user).where(user.user_id == db_ticket.user_id)
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    db_ticket.admin_reply = request.admin_reply.strip()
    db_ticket.status = request.status
    db_ticket.updated_at = sg_now()
    db_ticket.replied_at = sg_now()

    if request.status == SupportTicketStatus.resolved:
        db_ticket.closed_at = sg_now()

    try:
        db.add(db_ticket)
        db.commit()
        db.refresh(db_ticket)
        return build_admin_ticket_response(db_ticket, db_user)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put(
    "/{ticket_id}/close",
    response_model=SupportTicketAdminResponse,
    status_code=status.HTTP_200_OK
)
async def close_support_ticket(
    ticket_id: int,
    request: CloseSupportTicketRequest,
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(db, current_user)

    db_ticket = get_ticket_or_404(db, ticket_id)
    db_user = db.exec(
        select(user).where(user.user_id == db_ticket.user_id)
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    db_ticket.status = SupportTicketStatus.resolved
    db_ticket.updated_at = sg_now()
    db_ticket.closed_at = sg_now()

    try:
        db.add(db_ticket)
        db.commit()
        db.refresh(db_ticket)
        return build_admin_ticket_response(db_ticket, db_user)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )