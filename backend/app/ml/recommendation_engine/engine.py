from sqlmodel import Session, select

from app.models import meal
from .schemas import (
    RecommendationRequest,
    RecommendationResponse,
    ScoredCandidate,
    UserGoalContext,
)
from .utils import build_goal_context, build_preference_context
from .filters import fetch_all_candidates, apply_hard_filters, apply_calorie_budget_filter
from .content_scorer import compute_content_scores
from .collab_scorer import compute_collab_scores


def _get_user_rating_count(db: Session, user_id: int) -> int:
    """
    Returns the number of meals the user has explicitly rated.

    Args:
        db (Session): SQLModel database session.
        user_id (int): Target user ID.

    Returns:
        int: Count of rated meals.
    """
    rated = db.exec(
        select(meal).where(
            meal.user_id == user_id,
            meal.rating != None
        )
    ).all()
    return len(rated)


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
    candidates: list[ScoredCandidate],
    alpha: float
) -> list[ScoredCandidate]:
    """
    Merges content and collaborative scores into a single final_score.

    Args:
        candidates (list[ScoredCandidate]): Candidates with both scores populated.
        alpha (float): Weight for content_score. (1-alpha) for collab_score.

    Returns:
        list[ScoredCandidate]: Candidates with final_score populated.
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
    Orchestrates the full recommendation pipeline for a user.

    Pipeline:
      1. Build goal context (remaining macro budget)
      2. Build preference context (hard constraints)
      3. Fetch all food item candidates
      4. Apply hard filters (allergies, dietary restrictions)
      5. Apply calorie budget filter (soft pre-filter)
      6. Compute content-based scores
      7. Compute collaborative filtering scores
      8. Merge scores (dynamic alpha weighting)
      9. Sort and return top-N

    Fallback behaviour when no active goal exists:
      - Returns top-N most-logged food items globally (popularity-based).
      - remaining_budget is returned as a zero context.

    Args:
        db (Session): SQLModel database session.
        user_id (int): Authenticated user ID.
        request (RecommendationRequest): meal_type + top_n parameters.

    Returns:
        RecommendationResponse: Ranked recommendations + remaining budget.
    """
    # Step 1: Goal and preference context
    goal_ctx = build_goal_context(db, user_id)
    pref_ctx = build_preference_context(db, user_id)

    # Step 2: Fetch and filter candidates
    all_candidates = fetch_all_candidates(db)
    filtered = apply_hard_filters(all_candidates, pref_ctx)

    # Step 3: Fallback — no active goal
    if goal_ctx is None:
        # Sort by name alphabetically as a neutral fallback
        # Reason: Without a goal, we have no scoring basis. Popularity sort
        # would require a count query — keep it simple for now.
        fallback = [
            ScoredCandidate(
                food_id=c.food_id,
                name=c.name,
                calories=c.calories,
                protein_g=c.protein_g,
                carb_g=c.carb_g,
                fat_g=c.fat_g,
                content_score=0.0,
                collab_score=0.0,
                final_score=0.0
            )
            for c in filtered
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

    # Step 4: Calorie budget filter
    filtered = apply_calorie_budget_filter(filtered, goal_ctx.remaining_calories)

    # Step 5: Content-based scoring
    scored = compute_content_scores(filtered, goal_ctx)

    # Step 6: Collaborative filtering scoring
    rating_count = _get_user_rating_count(db, user_id)
    scored = compute_collab_scores(db, user_id, scored)

    # Step 7: Merge scores with dynamic alpha
    alpha = _compute_alpha(rating_count)
    scored = _merge_scores(scored, alpha)

    # Step 8: Sort descending, take top-N
    scored.sort(key=lambda x: x.final_score, reverse=True)
    top_n = scored[:request.top_n]

    return RecommendationResponse(
        meal_type=request.meal_type,
        recommendations=top_n,
        remaining_budget=goal_ctx,
    )