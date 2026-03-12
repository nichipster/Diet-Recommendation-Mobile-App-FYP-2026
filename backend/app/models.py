from typing import Optional
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from enum import Enum

class UserRole(str, Enum):
    admin = 'admin'
    freemium = 'freemium'
    premium = 'premium'

class User(SQLModel, table=True):
    user_id : Optional[int] = Field(default=None, primary_key=True)
    first_name : str 
    last_name : str
    email : str = Field(unique=True)
    phone_number : Optional[str] = None
    hashed_password : str
    created_at : datetime = Field(default_factory=lambda: datetime.now(ZoneInfo('Asia/Singapore')))
    role : UserRole
    premium_start : Optional[datetime] = None
    premium_end : Optional[datetime] = None
    suspended : bool = False

    profile: Optional["UserProfile"] = Relationship(back_populates="user")


class Gender(str, Enum):
    male = "male"
    female = "female"

class GoalType(str, Enum):
    lose = "lose"
    maintain = "maintain"
    gain = "gain"

class WeeklyGoalRate(str, Enum):
    aggressive = "aggressive"
    moderate = "moderate"
    conservative = "conservative"

class ActivityLevel(str, Enum):
    sedentary = "sedentary"
    lightly_active = "lightly_active"
    active = "active"
    very_active = "very_active"

class UserProfile(SQLModel, table=True):
    profile_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id", unique=True, index=True)

    # Personal info
    gender: Optional[Gender] = None
    age: Optional[int] = Field(default=None, ge=1, le=120)
    height_cm: Optional[float] = Field(default=None, gt=0)
    weight_kg: Optional[float] = Field(default=None, gt=0)

    # Goal info
    goal_type: Optional[GoalType] = None
    goal_weight_kg: Optional[float] = Field(default=None, gt=0)
    weekly_goal_rate: Optional[WeeklyGoalRate] = None
    weekly_goal_percentage: Optional[float] = Field(default=None, gt=0, le=1.5)
    weekly_weight_change_kg: Optional[float] = None

    # Activity
    activity_level: Optional[ActivityLevel] = None

    # Dietary / health info
    health_conditions: Optional[list[str]] = Field(default=None, sa_column=Column(JSONB))
    allergies: Optional[list[str]] = Field(default=None, sa_column=Column(JSONB))
    dietary_restrictions: Optional[list[str]] = Field(default=None, sa_column=Column(JSONB))

    # Optional advanced fields
    body_fat_percentage: Optional[float] = Field(default=None, gt=0, le=100)
    avg_weekly_cardio_minutes: Optional[int] = Field(default=None, ge=0)

    created_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo("Asia/Singapore")))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo("Asia/Singapore")))

    user: Optional["User"] = Relationship(back_populates="profile")