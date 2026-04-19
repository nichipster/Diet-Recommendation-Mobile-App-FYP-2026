from pydantic import BaseModel, Field
from typing import Optional
from ...models import MealType


class UserGoalContext(BaseModel):
    """
    Snapshot of what the user still needs today.

    All values represent *remaining* budget, not total targets.
    Can be negative if the user has already exceeded their goal.
    """
    user_id: int
    remaining_calories: float
    remaining_protein_g: float
    remaining_carb_g: float
    remaining_fat_g: float
    goal_type: str          # "lose" | "maintain" | "gain"


class UserPreferenceContext(BaseModel):
    """
    Hard-constraint preferences. Any item violating these is excluded
    before scoring — not penalised, excluded entirely.
    """
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_halal: bool = False
    is_gluten_free: bool = False
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


class RecipeCandidate(BaseModel):
    """
    A single Spoonacular-sourced recipe eligible for recommendation scoring.
    Nutritional values represent per-serving totals stored at ingestion time.
    """
    recipe_id: int
    spoonacular_id: Optional[int] 
    title: str
    meal_type: MealType
    cuisine_type: Optional[str]
    
    calories: float
    protein_g: float
    carb_g: float
    fat_g: float

    is_vegetarian: bool = False
    is_vegan: bool = False
    is_halal: bool = False
    is_gluten_free: bool = False


class ScoredRecipe(BaseModel):
    """Output of the scoring stage: a recipe candidate with its composite score."""
    recipe_id: int
    spoonacular_id: Optional[int]        
    title: str
    meal_type: MealType
    calories: float
    protein_g: float
    carb_g: float
    fat_g: float
    content_score: float = 0.0
    collab_score: float = 0.0
    final_score: float = 0.0


class RecommendationRequest(BaseModel):
    """What the FastAPI route receives from the client."""
    meal_type: MealType
    top_n: int = Field(default=10, ge=1, le=50)


class RecommendationResponse(BaseModel):
    """What the FastAPI route returns to the client."""
    meal_type: MealType
    recommendations: list[ScoredRecipe]
    remaining_budget: UserGoalContext