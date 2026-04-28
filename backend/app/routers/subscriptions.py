from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import (
    user,
    user_subscription,
    subscription_transaction,
    UserRole,
    SubscriptionPlan,
    SubscriptionStatus,
    SubscriptionTransactionType,
    SubscriptionTransactionStatus,
)


MONTHLY_PRICE = 9.90
ANNUAL_PRICE = 99.00


router = APIRouter(
    prefix="/subscriptions",
    tags=["Subscriptions"]
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


def get_active_subscription(
    db: db_dependency,
    user_id: int
) -> Optional[user_subscription]:
    return db.exec(
        select(user_subscription).where(
            user_subscription.user_id == user_id,
            user_subscription.status == SubscriptionStatus.active
        )
    ).first()


def get_subscription_price(plan: SubscriptionPlan) -> float:
    if plan == SubscriptionPlan.monthly:
        return MONTHLY_PRICE
    return ANNUAL_PRICE


def calculate_subscription_end_at(
    start_at: datetime,
    plan: SubscriptionPlan
) -> datetime:
    if plan == SubscriptionPlan.monthly:
        return start_at + timedelta(days=30)
    return start_at + timedelta(days=365)


def get_display_subscription_status(subscription: user_subscription) -> str:
    now = sg_now()

    if (
        subscription.status == SubscriptionStatus.active
        and subscription.cancelled_at is not None
        and subscription.end_at is not None
        and now < subscription.end_at
    ):
        return "cancelling"

    return subscription.status.value


def validate_mock_card_fields(
    card_holder_name: str,
    card_number: str,
    expiry_month: int,
    expiry_year: int,
    cvv: str
) -> None:
    if not card_holder_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Card holder name is required"
        )

    cleaned_number = "".join(ch for ch in card_number if ch.isdigit())
    if len(cleaned_number) < 12 or len(cleaned_number) > 19:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Card number is invalid"
        )

    if expiry_month < 1 or expiry_month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry month is invalid"
        )

    current_year = sg_now().year
    if expiry_year < current_year or expiry_year > current_year + 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry year is invalid"
        )

    if not cvv.isdigit() or len(cvv) not in {3, 4}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CVV is invalid"
        )
    

class SubscriptionCheckoutRequest(BaseModel):
    plan: SubscriptionPlan
    card_holder_name: str = Field(min_length=1, max_length=100)
    card_number: str = Field(min_length=12, max_length=25)
    expiry_month: int
    expiry_year: int
    cvv: str = Field(min_length=3, max_length=4)


class SubscriptionCheckoutResponse(BaseModel):
    subscription_id: int
    plan: SubscriptionPlan
    status: SubscriptionStatus
    start_at: datetime
    amount: float
    currency: str
    role: str


class MySubscriptionResponse(BaseModel):
    subscription_id: Optional[int] = None
    plan: Optional[SubscriptionPlan] = None
    status: str
    price: float = 0
    currency: str = "SGD"
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None


class CancelSubscriptionResponse(BaseModel):
    message: str
    subscription_id: int
    status: SubscriptionStatus
    cancelled_at: datetime


class SubscriptionTransactionResponse(BaseModel):
    id: int
    type: SubscriptionTransactionType
    status: SubscriptionTransactionStatus
    plan: Optional[SubscriptionPlan] = None
    amount: float
    currency: str
    created_at: datetime
    message: Optional[str] = None


@router.post(
    "/checkout",
    response_model=SubscriptionCheckoutResponse,
    status_code=status.HTTP_201_CREATED
)
async def checkout_subscription(
    request: SubscriptionCheckoutRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    if db_user.role == UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin users cannot subscribe through this endpoint"
        )

    existing_active_subscription = get_active_subscription(db, db_user.user_id)
    if existing_active_subscription is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an active subscription"
        )

    validate_mock_card_fields(
        card_holder_name=request.card_holder_name,
        card_number=request.card_number,
        expiry_month=request.expiry_month,
        expiry_year=request.expiry_year,
        cvv=request.cvv
    )

    now = sg_now()
    price = get_subscription_price(request.plan)
    end_at = calculate_subscription_end_at(now, request.plan)

    new_subscription = user_subscription(
        user_id=db_user.user_id,
        plan=request.plan,
        status=SubscriptionStatus.active,
        price=price,
        currency="SGD",
        start_at=now,
        end_at=end_at,
        cancelled_at=None,
        created_at=now,
        updated_at=now
    )

    try:
        db.add(new_subscription)
        db.commit()
        db.refresh(new_subscription)

        db_user.role = UserRole.premium
        db_user.premium_start = now
        db_user.premium_end = end_at

        db.add(db_user)
        db.add(
            subscription_transaction(
                user_id=db_user.user_id,
                subscription_id=new_subscription.subscription_id,
                transaction_type=SubscriptionTransactionType.checkout,
                status=SubscriptionTransactionStatus.success,
                plan=request.plan,
                amount=price,
                currency="SGD",
                payment_provider="mock_gateway",
                provider_reference=f"mock_checkout_{new_subscription.subscription_id}",
                message="Subscription checkout completed"
            )
        )

        db.commit()
        db.refresh(db_user)

        return SubscriptionCheckoutResponse(
            subscription_id=new_subscription.subscription_id,
            plan=new_subscription.plan,
            status=new_subscription.status,
            start_at=new_subscription.start_at,
            amount=new_subscription.price,
            currency=new_subscription.currency,
            role=db_user.role
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/my",
    response_model=MySubscriptionResponse,
    status_code=status.HTTP_200_OK
)
async def get_my_subscription(
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    active_subscription = get_active_subscription(db, db_user.user_id)

    if (
        active_subscription is not None
        and active_subscription.end_at is not None
        and sg_now() >= active_subscription.end_at
    ):
        active_subscription.status = SubscriptionStatus.expired
        active_subscription.updated_at = sg_now()

        db_user.role = UserRole.freemium
        db_user.premium_end = active_subscription.end_at

        try:
            db.add(active_subscription)
            db.add(db_user)
            db.commit()
            db.refresh(active_subscription)
            db.refresh(db_user)
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

        active_subscription = None

    if active_subscription is not None:
        display_status = get_display_subscription_status(active_subscription)

        return MySubscriptionResponse(
            subscription_id=active_subscription.subscription_id,
            plan=active_subscription.plan,
            status=display_status,
            price=active_subscription.price,
            currency=active_subscription.currency,
            start_at=active_subscription.start_at,
            end_at=active_subscription.end_at,
            cancelled_at=active_subscription.cancelled_at
        )

    latest_subscription = db.exec(
        select(user_subscription)
        .where(user_subscription.user_id == db_user.user_id)
        .order_by(user_subscription.created_at.desc())
    ).first()

    if latest_subscription is None:
        return MySubscriptionResponse(
            subscription_id=None,
            plan=None,
            status="inactive",
            price=0,
            currency="SGD",
            start_at=None,
            end_at=None,
            cancelled_at=None
        )

    return MySubscriptionResponse(
        subscription_id=latest_subscription.subscription_id,
        plan=latest_subscription.plan,
        status=latest_subscription.value,
        price=latest_subscription.price,
        currency=latest_subscription.currency,
        start_at=latest_subscription.start_at,
        end_at=latest_subscription.end_at,
        cancelled_at=latest_subscription.cancelled_at
    )


@router.post(
    "/cancel",
    response_model=CancelSubscriptionResponse,
    status_code=status.HTTP_200_OK
)
async def cancel_subscription(
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    active_subscription = get_active_subscription(db, db_user.user_id)
    if active_subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )

    now = sg_now()

    if active_subscription.cancelled_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subscription is already scheduled for cancellation"
        )

    active_subscription.cancelled_at = now
    active_subscription.updated_at = now

    try:
        db.add(active_subscription)
        db.add(db_user)
        db.add(
            subscription_transaction(
                user_id=db_user.user_id,
                subscription_id=active_subscription.subscription_id,
                transaction_type=SubscriptionTransactionType.cancel,
                status=SubscriptionTransactionStatus.success,
                plan=active_subscription.plan,
                amount=0,
                currency=active_subscription.currency,
                payment_provider="mock_gateway",
                provider_reference=f"mock_cancel_{active_subscription.subscription_id}",
                message="Subscription cancellation scheduled successfully"
            )
        )

        db.commit()
        db.refresh(active_subscription)

        return CancelSubscriptionResponse(
            message="Subscription cancellation scheduled successfully",
            subscription_id=active_subscription.subscription_id,
            status=active_subscription.status,
            cancelled_at=active_subscription.cancelled_at
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/transactions",
    response_model=list[SubscriptionTransactionResponse],
    status_code=status.HTTP_200_OK
)
async def get_subscription_transactions(
    db: db_dependency,
    current_user: user_dependency
):
    db_user = get_current_db_user(db, current_user)

    transactions = db.exec(
        select(subscription_transaction)
        .where(subscription_transaction.user_id == db_user.user_id)
        .order_by(subscription_transaction.created_at.desc())
    ).all()

    return [
        SubscriptionTransactionResponse(
            id=tx.transaction_id,
            type=tx.transaction_type,
            status=tx.status,
            plan=tx.plan,
            amount=tx.amount,
            currency=tx.currency,
            created_at=tx.created_at,
            message=tx.message
        )
        for tx in transactions
    ]