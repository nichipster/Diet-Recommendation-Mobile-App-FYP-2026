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


class user(SQLModel, table=True):
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

    profile: Optional["user_profile"] = Relationship(back_populates="user")
    preferences: Optional["user_preferences"] = Relationship(back_populates="user")
    dietary_goals: list["dietary_goal"] = Relationship(back_populates="user")
    weight_logs: list["weight_log"] = Relationship(back_populates="user")


class user_profile(SQLModel, table=True):
    profile_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id", unique=True, index=True)

    gender: Optional[Gender] = None
    age: Optional[int] = Field(default=None, ge=1, le=120)
    height_cm: Optional[float] = Field(default=None, gt=0)
    weight_kg: Optional[float] = Field(default=None, gt=0)
    activity_level: Optional[ActivityLevel] = None
    body_fat_percentage: Optional[float] = Field(default=None, gt=0, le=100)

    created_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo("Asia/Singapore")))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo("Asia/Singapore")))

    user: Optional["user"] = Relationship(back_populates="profile")


class user_preferences(SQLModel, table=True):
    preference_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id", unique=True, index=True)

    is_vegetarian: bool = False
    is_vegan: bool = False
    is_halal: bool = False
    is_gluten_free: bool = False
    allergies: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo("Asia/Singapore")))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo("Asia/Singapore")))

    user: Optional["user"] = Relationship(back_populates="preferences")


class dietary_goal(SQLModel, table=True):
    goal_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id", index=True)

    goal_type: GoalType
    target_weight_kg: float = Field(gt=0)
    weekly_goal_rate: WeeklyGoalRate
    daily_calorie_target: int = Field(gt=0)
    daily_protein_g: float = Field(ge=0)
    daily_carb_g: float = Field(ge=0)
    daily_fat_g: float = Field(ge=0)
    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo("Asia/Singapore")))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo("Asia/Singapore")))

    user: Optional["user"] = Relationship(back_populates="dietary_goals")


class weight_log(SQLModel, table=True):
    weight_log_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id", index=True)

    weight_kg: float = Field(gt=0)
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo("Asia/Singapore")))

    user: Optional["user"] = Relationship(back_populates="weight_logs")