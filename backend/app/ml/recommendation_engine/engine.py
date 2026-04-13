from sqlmodel import Session, select

from app.models import meal
from .schemas import (
    RecommendationRequest,
    RecommendationResponse,
    ScoredRecipe,
    UserGoalContext,
)
from .utils import build_goal_context, build_preference_context
from .filters import fetch_recipe_candidates, apply_hard_filters, apply_calorie_budget_filter
from .content_scorer import compute_content_scores
from .collab_scorer import compute_collab_scores


def _get_user_rating_count(db: Session, user_id: int) -> int:
    """Returns count of recommendation_log rows where the user gave an explicit rating."""
    from app.models import recommendation_log
    logs = db.exec(
        select(recommendation_log).where(
            recommendation_log.user_id == user_id,
            recommendation_log.rating != None
        )
    ).all()
    return len(logs)


def _compute_alpha(rating_count: int) -> float:
    """
    Determines the content-based weight (alpha) for the hybrid score.

    The more behavioral data a user has, the more the collaborative signal
    is trusted. Alpha decreases as rating_count grows.

    Args:
        rating_count (int): Number of meals the user has rated.

    Returns:
        float: Alpha in [0.5, 1.0].
    """
    if rating_count == 0:
        return 1.0    # Pure content-based — no CF data
    if rating_count < 10:
        return 0.7    # Mostly content, some CF influence
    return 0.5        # Balanced hybrid


def _merge_scores(
    candidates: list[ScoredRecipe],
    alpha: float
) -> list[ScoredRecipe]:
    """
    Merges content and collaborative scores into a single final_score.

    Args:
        candidates (list[ScoredRecipe]): Candidates with both scores populated.
        alpha (float): Weight for content_score. (1-alpha) for collab_score.

    Returns:
        list[ScoredRecipe]: Candidates with final_score populated.
    """
    for c in candidates:
        c.final_score = round(alpha * c.content_score + (1 - alpha) * c.collab_score, 4)
    return candidates


def get_recommendations(
    db: Session,
    user_id: int,
    request: RecommendationRequest
) -> RecommendationResponse:
    """
    Orchestrates the full recommendation pipeline.

    CHANGE FROM PREVIOUS VERSION:
    - Candidates are now recipe rows, not food_item rows.
    - fetch_all_candidates() replaced by fetch_recipe_candidates(meal_type).
    - meal_type filter is applied at DB query level, not post-fetch.
    - ScoredCandidate replaced by ScoredRecipe (carries spoonacular_id).
    - Collab matrix sourced from recommendation_log, not meal_item.
    """
    goal_ctx = build_goal_context(db, user_id)
    pref_ctx = build_preference_context(db, user_id)

    # ← KEY CHANGE: query recipe table, filtered by meal_type at DB level
    all_candidates = fetch_recipe_candidates(db, request.meal_type)
    filtered = apply_hard_filters(all_candidates, pref_ctx)

    if goal_ctx is None:
        # Fallback: no active goal — return by lowest calorie (neutral ordering)
        fallback = [
            ScoredRecipe(
                recipe_id=c.recipe_id,
                spoonacular_id=c.spoonacular_id,
                title=c.title,
                meal_type=c.meal_type,
                calories=c.calories,
                protein_g=c.protein_g,
                carb_g=c.carb_g,
                fat_g=c.fat_g,
            )
            for c in sorted(filtered, key=lambda x: x.calories)
        ]
        zero_ctx = UserGoalContext(
            user_id=user_id,
            remaining_calories=0,
            remaining_protein_g=0,
            remaining_carb_g=0,
            remaining_fat_g=0,
            goal_type="maintain"
        )
        return RecommendationResponse(
            meal_type=request.meal_type,
            recommendations=fallback[:request.top_n],
            remaining_budget=zero_ctx,
        )

    filtered = apply_calorie_budget_filter(filtered, goal_ctx.remaining_calories)
    scored = compute_content_scores(filtered, goal_ctx)
    
    rating_count = _get_user_rating_count(db, user_id)
    scored = compute_collab_scores(db, user_id, scored)
    
    alpha = _compute_alpha(rating_count)
    scored = _merge_scores(scored, alpha)
    scored.sort(key=lambda x: x.final_score, reverse=True)

    return RecommendationResponse(
        meal_type=request.meal_type,
        recommendations=scored[:request.top_n],
        remaining_budget=goal_ctx,
    )