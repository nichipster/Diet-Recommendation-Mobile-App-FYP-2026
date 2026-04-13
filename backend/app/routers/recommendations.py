from fastapi import APIRouter, HTTPException, status
from sqlmodel import Session

from ..dependencies import db_dependency, user_dependency
from ..ml.recommendation_engine.schemas import RecommendationRequest, RecommendationResponse
from ..ml.recommendation_engine.engine import get_recommendations

router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"]
)


@router.post(
    "/",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get personalised meal recommendations",
    description=(
        "Returns top-N food item recommendations ranked by a hybrid "
        "content-based + collaborative filtering score. "
        "Results adapt to the user's remaining macro/calorie budget for today."
    )
)
def recommend_meals(
    request: RecommendationRequest,
    db: db_dependency,
    current_user: user_dependency,
) -> RecommendationResponse:
    """
    Generates personalised meal recommendations for the authenticated user.

    The engine runs the following pipeline:
    1. Fetches the user's active dietary goal and today's consumed totals.
    2. Applies hard dietary/allergy filters.
    3. Scores remaining candidates by macro match (content-based).
    4. Enriches scores with collaborative ratings from similar users.
    5. Returns top-N ranked results.

    Args:
        request (RecommendationRequest): meal_type and top_n from client.
        db (db_dependency): Injected database session.
        current_user (user_dependency): JWT-decoded user payload.

    Returns:
        RecommendationResponse: Ranked recommendations + remaining budget.

    Raises:
        HTTPException 401: If the token is invalid or missing.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user_id = int(current_user["id"])

    return get_recommendations(db=db, user_id=user_id, request=request)