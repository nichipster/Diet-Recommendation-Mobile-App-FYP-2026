from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, UserRole, booking, BookingStatus, meal, dietary_goal

router = APIRouter(prefix="/clients", tags=["Clients"])


def get_current_db_user(db: db_dependency, current_user: user_dependency) -> user:
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    db_user = db.exec(select(user).where(user.user_id == int(current_user["id"]))).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


def full_name(db_user: user) -> str:
    return f"{db_user.first_name} {db_user.last_name}".strip()


def ensure_client_access(db: db_dependency, db_user: user, client_id: int) -> None:
    if db_user.role == UserRole.admin or db_user.user_id == client_id:
        return
    if db_user.role == UserRole.nutritionist:
        linked = db.exec(
            select(booking).where(
                booking.nutritionist_id == db_user.user_id,
                booking.user_id == client_id,
                booking.status.in_([BookingStatus.confirmed, BookingStatus.pending]),
            )
        ).first()
        if linked is not None:
            return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client access denied")


class ClientGoalsResponse(BaseModel):
    calories: float
    protein: float
    carbs: float
    fats: float


class ClientMealResponse(BaseModel):
    id: str
    date: str
    food: str
    calories: float
    protein: float
    carbs: float
    fats: float


class ClientProgressResponse(BaseModel):
    name: str
    goal: str
    goals: ClientGoalsResponse
    meals: list[ClientMealResponse]


@router.get("/{client_id}/progress", response_model=ClientProgressResponse, status_code=status.HTTP_200_OK)
async def get_client_progress(client_id: int, db: db_dependency, current_user: user_dependency):
    db_user = get_current_db_user(db, current_user)
    ensure_client_access(db, db_user, client_id)

    client = db.exec(select(user).where(user.user_id == client_id)).first()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    active_goal = db.exec(
        select(dietary_goal).where(
            dietary_goal.user_id == client_id,
            dietary_goal.is_active == True,
        ).order_by(dietary_goal.updated_at.desc())
    ).first()

    meals = db.exec(
        select(meal).where(meal.user_id == client_id).order_by(meal.consumed_at.desc())
    ).all()

    return ClientProgressResponse(
        name=full_name(client),
        goal=active_goal.goal_type.value if active_goal else "maintain",
        goals=ClientGoalsResponse(
            calories=active_goal.daily_calorie_target if active_goal else 0,
            protein=active_goal.daily_protein_g if active_goal else 0,
            carbs=active_goal.daily_carb_g if active_goal else 0,
            fats=active_goal.daily_fat_g if active_goal else 0,
        ),
        meals=[
            ClientMealResponse(
                id=str(m.meal_id),
                date=m.consumed_at.date().isoformat(),
                food=m.meal_name,
                calories=m.calories,
                protein=m.protein_g,
                carbs=m.carb_g,
                fats=m.fat_g,
            )
            for m in meals
        ],
    )
