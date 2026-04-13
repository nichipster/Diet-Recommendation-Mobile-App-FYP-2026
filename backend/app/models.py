from typing import Optional
from datetime import datetime, date
from zoneinfo import ZoneInfo
from enum import Enum

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import UniqueConstraint, event, text


SG_TZ = ZoneInfo("Asia/Singapore")

def sg_now() -> datetime:
    return datetime.now(SG_TZ)


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
    stagnant = "stagnant"

class ActivityLevel(str, Enum):
    sedentary = "sedentary"
    lightly_active = "lightly_active"
    active = "active"
    very_active = "very_active"

class MealType(str, Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"

class FoodSource(str, Enum):
    ingredient = "ingredient"
    product = "product"
    manual = "manual"


class user(SQLModel, table=True):
    user_id : Optional[int] = Field(default=None, primary_key=True)
    first_name : str 
    last_name : str
    email : str = Field(unique=True)
    hashed_password : str
    created_at : datetime = Field(default_factory=sg_now)
    role : UserRole
    premium_start : Optional[datetime] = None
    premium_end : Optional[datetime] = None
    suspended : bool = False

    profile: Optional["user_profile"] = Relationship(back_populates="user")
    preferences: Optional["user_preferences"] = Relationship(back_populates="user")
    dietary_goals: list["dietary_goal"] = Relationship(back_populates="user")
    water_intake_logs: list["water_intake_log"] = Relationship(back_populates="user")
    weight_logs: list["weight_log"] = Relationship(back_populates="user")
    dietary_entries: list["dietary_entry"] = Relationship(back_populates="user")
    meals: list["meal"] = Relationship(back_populates="user")
    recipes: list["recipe"] = Relationship(back_populates="user")
    favourite_meals: list["favourite_meal"] = Relationship(back_populates="user")
    recommendation_logs: list["recommendation_log"] = Relationship(back_populates="user")


class user_profile(SQLModel, table=True):
    profile_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id", unique=True, index=True)

    gender: Gender 
    dob: date 
    height_cm: float = Field(gt=0)
    weight_kg: float = Field(gt=0)
    activity_level: ActivityLevel 
    tdee: int = Field(gt=0)

    created_at: datetime = Field(default_factory=sg_now)
    updated_at: datetime = Field(default_factory=sg_now)

    user: Optional["user"] = Relationship(back_populates="profile")

class user_preferences(SQLModel, table=True):
    preference_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id", unique=True, index=True)

    is_vegetarian: bool = False
    is_vegan: bool = False
    is_halal: bool = False
    is_gluten_free: bool = False

    # allergens
    has_peanut_allergy: bool = False
    has_tree_nut_allergy: bool = False
    has_milk_allergy: bool = False
    has_egg_allergy: bool = False
    has_fish_allergy: bool = False
    has_shellfish_allergy: bool = False
    has_soy_allergy: bool = False
    has_wheat_allergy: bool = False
    has_sesame_allergy: bool = False
    has_sulfite_allergy: bool = False    

    allergy_notes: Optional[str] = None

    created_at: datetime = Field(default_factory=sg_now)
    updated_at: datetime = Field(default_factory=sg_now)

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

    created_at: datetime = Field(default_factory=sg_now)
    updated_at: datetime = Field(default_factory=sg_now)

    user: Optional["user"] = Relationship(back_populates="dietary_goals")


class water_intake_log(SQLModel, table=True):
    water_log_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id", index=True)

    amount_ml: int = Field(gt=0)
    logged_at: datetime = Field(default_factory=sg_now)

    user: Optional["user"] = Relationship(back_populates="water_intake_logs")


class weight_log(SQLModel, table=True):
    weight_log_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id", index=True)

    weight_kg: float = Field(gt=0)
    recorded_at: datetime = Field(default_factory=sg_now)

    user: Optional["user"] = Relationship(back_populates="weight_logs")


class dietary_entry(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "entry_date", name="uq_dietary_entry_user_date"),)

    entry_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id", index=True)
    entry_date: date
    total_calories_consumed: float = Field(ge=0)
    total_protein_g: float = Field(ge=0)
    total_carb_g: float = Field(ge=0)
    total_fat_g: float = Field(ge=0)

    created_at: datetime = Field(default_factory=sg_now)
    updated_at: datetime = Field(default_factory=sg_now)

    user: Optional["user"] = Relationship(back_populates="dietary_entries")


class meal(SQLModel, table=True):
    meal_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id", index=True)

    meal_name: str
    meal_type: MealType
    consumed_at: datetime = Field(default_factory=sg_now)
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    total_calories: float = Field(ge=0)
    total_protein_g: float = Field(ge=0)
    total_carb_g: float = Field(ge=0)
    total_fat_g: float = Field(ge=0)
    total_sugar_g: float = Field(ge=0)
    total_sodium_mg: float = Field(ge=0)

    created_at: datetime = Field(default_factory=sg_now)
    updated_at: datetime = Field(default_factory=sg_now)

    user: Optional["user"] = Relationship(back_populates="meals")
    meal_items: list["meal_item"] = Relationship(back_populates="meal")


class food_item(SQLModel, table=True):
    food_id: Optional[int] = Field(default=None, primary_key=True)
    external_id: Optional[int] = Field(default=None, index=True)
    name: str
    source: FoodSource
    brand: Optional[str] = None
    barcode: Optional[str] = Field(default=None, unique=True, index=True)
    serving_size: float = Field(gt=0)
    serving_unit: str
    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carb_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    sugar_g: float = Field(ge=0)
    fiber_g: float = Field(ge=0)
    sodium_mg: float = Field(ge=0)

    meal_items: list["meal_item"] = Relationship(back_populates="food_item")
    recipe_items: list["recipe_item"] = Relationship(back_populates="food_item")


class meal_item(SQLModel, table=True):
    meal_item_id: Optional[int] = Field(default=None, primary_key=True)
    meal_id: int = Field(foreign_key="meal.meal_id", index=True)
    food_id: int = Field(foreign_key="food_item.food_id", index=True)

    amount: float = Field(gt=0)
    unit: str
    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carb_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)

    meal: Optional["meal"] = Relationship(back_populates="meal_items")
    food_item: Optional["food_item"] = Relationship(back_populates="meal_items")


class recipe(SQLModel, table=True):
    recipe_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.user_id", index=True)
    spoonacular_id: Optional[int] = Field(default=None, unique=True, index=True)

    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    cuisine_type: Optional[str] = None

    servings: int = Field(gt=0)
    meal_type: MealType
    cook_time_min: int = Field(ge=0)
    total_calories: float = Field(ge=0)
    total_protein_g: float = Field(ge=0)
    total_carb_g: float = Field(ge=0)
    total_fat_g: float = Field(ge=0)

    is_vegetarian: bool = Field(default=False)
    is_vegan: bool = Field(default=False)
    is_halal: bool = Field(default=False)
    is_gluten_free: bool = Field(default=False)

    is_custom: bool = True
    is_public: bool = False
    
    created_at: datetime = Field(default_factory=sg_now)
    updated_at: datetime = Field(default_factory=sg_now)

    user: Optional["user"] = Relationship(back_populates="recipes")
    recipe_items: list["recipe_item"] = Relationship(back_populates="recipe")


class recipe_item(SQLModel, table=True):
    recipe_item_id: Optional[int] = Field(default=None, primary_key=True)
    recipe_id: int = Field(foreign_key="recipe.recipe_id", index=True)
    food_id: int = Field(foreign_key="food_item.food_id", index=True)

    quantity: float = Field(gt=0)
    unit: str

    recipe: Optional["recipe"] = Relationship(back_populates="recipe_items")
    food_item: Optional["food_item"] = Relationship(back_populates="recipe_items")

class favourite_meal(SQLModel, table=True):
    favourite_meal_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id", index=True)

    name: str
    meal_type: MealType

    created_at: datetime = Field(default_factory=sg_now)
    updated_at: datetime = Field(default_factory=sg_now)

    user: Optional["user"] = Relationship(back_populates="favourite_meals")
    favourite_meal_items: list["favourite_meal_item"] = Relationship(back_populates="favourite_meal")

class favourite_meal_item(SQLModel, table=True):
    favourite_meal_item_id: Optional[int] = Field(default=None, primary_key=True)
    favourite_meal_id: int = Field(foreign_key="favourite_meal.favourite_meal_id", index=True)
    food_id: int = Field(foreign_key="food_item.food_id", index=True)

    quantity: float = Field(gt=0)
    unit: str

    favourite_meal: Optional["favourite_meal"] = Relationship(back_populates="favourite_meal_items")
    food_item: Optional["food_item"] = Relationship()

class recommendation_log(SQLModel, table=True):
    log_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id", index=True)
    recipe_id: int = Field(foreign_key="recipe.recipe_id", index=True)
    meal_type: MealType
    recommended_at: datetime = Field(default_factory=sg_now)
    was_accepted: bool = False

@event.listens_for(weight_log, "after_insert")
def sync_weight_to_profile(mapper, connection, target: "weight_log") -> None:
    """
    Syncs the most recently recorded weight to user_profile.weight_kg
    whenever a new weight_log row is inserted.

    Uses a subquery so out-of-order inserts (backdated logs) are handled
    correctly — the profile always reflects the chronologically latest entry,
    not just the most recently *inserted* one.

    Args:
        mapper: SQLAlchemy mapper (injected by event system).
        connection: The raw DBAPI connection within the current transaction.
        target (weight_log): The newly inserted weight_log instance.
    """
    connection.execute(
        text("""
            UPDATE user_profile
            SET
                weight_kg = (
                    SELECT weight_kg
                    FROM weight_log
                    WHERE user_id = :uid
                    ORDER BY recorded_at DESC
                    LIMIT 1
                ),
                updated_at = :now
            WHERE user_id = :uid
        """),
        {"uid": target.user_id, "now": sg_now()},
    )