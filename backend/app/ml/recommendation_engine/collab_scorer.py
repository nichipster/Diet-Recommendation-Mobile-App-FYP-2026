from collections import defaultdict
from math import sqrt

from sqlmodel import Session, select

from app.models import meal, meal_item
from .schemas import ScoredCandidate


def _build_user_item_matrix(
    db: Session,
    target_user_id: int
) -> tuple[dict[int, dict[int, float]], dict[int, float]]:
    """
    Builds a user-item rating matrix from meal logs.

    Each cell represents the average rating a user gave to a food_item
    across all meals containing that item.

    Only meals with an explicit rating (not None) are included.

    Args:
        db (Session): SQLModel database session.
        target_user_id (int): The user requesting recommendations.

    Returns:
        tuple:
            - user_item: {user_id: {food_id: avg_rating}}
            - target_vector: {food_id: avg_rating} for the target user only
    """
    # Fetch all rated meals
    rated_meals = db.exec(
        select(meal).where(meal.rating != None)
    ).all()

    # {user_id: {food_id: [ratings]}}
    raw: dict[int, dict[int, list[float]]] = defaultdict(lambda: defaultdict(list))

    for m in rated_meals:
        items = db.exec(
            select(meal_item).where(meal_item.meal_id == m.meal_id)
        ).all()
        for item in items:
            raw[m.user_id][item.food_id].append(float(m.rating))

    # Average ratings per user per food
    user_item: dict[int, dict[int, float]] = {
        uid: {fid: sum(ratings) / len(ratings) for fid, ratings in foods.items()}
        for uid, foods in raw.items()
    }

    target_vector = user_item.get(target_user_id, {})
    return user_item, target_vector


def _cosine_similarity(
    vec_a: dict[int, float],
    vec_b: dict[int, float]
) -> float:
    """
    Computes cosine similarity between two sparse rating vectors.

    Args:
        vec_a (dict[int, float]): {food_id: rating} for user A.
        vec_b (dict[int, float]): {food_id: rating} for user B.

    Returns:
        float: Cosine similarity in [0, 1], or 0.0 if no shared items.
    """
    common_items = set(vec_a.keys()) & set(vec_b.keys())
    if not common_items:
        return 0.0

    dot = sum(vec_a[i] * vec_b[i] for i in common_items)
    norm_a = sqrt(sum(v ** 2 for v in vec_a.values()))
    norm_b = sqrt(sum(v ** 2 for v in vec_b.values()))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot / (norm_a * norm_b)


def compute_collab_scores(
    db: Session,
    target_user_id: int,
    candidates: list[ScoredCandidate],
    top_k_neighbors: int = 20,
    min_similarity: float = 0.1
) -> list[ScoredCandidate]:
    """
    Enriches each ScoredCandidate with a collaborative filtering score.

    Uses user-based CF: finds the top-K most similar users and predicts
    the target user's rating for each candidate food item.

    The collab_score is normalised to [0, 1] by dividing by 5 (max rating).

    Cold-start handling:
    - If the target user has no ratings: collab_score = 0.0 for all candidates.
      The hybrid score will rely entirely on content_score.
    - If no similar users are found: same fallback.
    - If a candidate food has no ratings from similar users: collab_score = 0.0.

    Args:
        db (Session): SQLModel database session.
        target_user_id (int): The user requesting recommendations.
        candidates (list[ScoredCandidate]): Candidates to score.
        top_k_neighbors (int): Number of similar users to consider.
        min_similarity (float): Minimum similarity threshold to include a neighbor.

    Returns:
        list[ScoredCandidate]: Candidates with collab_score populated.
    """
    user_item, target_vector = _build_user_item_matrix(db, target_user_id)

    # Cold start: target user has no ratings
    if not target_vector:
        for c in candidates:
            c.collab_score = 0.0
        return candidates

    # Compute similarity between target user and all other users
    similarities: list[tuple[int, float]] = []
    for uid, item_ratings in user_item.items():
        if uid == target_user_id:
            continue
        sim = _cosine_similarity(target_vector, item_ratings)
        if sim >= min_similarity:
            similarities.append((uid, sim))

    # Keep only top-K neighbours
    similarities.sort(key=lambda x: x[1], reverse=True)
    top_neighbors = similarities[:top_k_neighbors]

    if not top_neighbors:
        for c in candidates:
            c.collab_score = 0.0
        return candidates

    # Predict rating for each candidate
    candidate_ids = {c.food_id for c in candidates}

    predicted: dict[int, float] = {}
    for food_id in candidate_ids:
        numerator = 0.0
        denominator = 0.0
        for uid, sim in top_neighbors:
            rating = user_item[uid].get(food_id)
            if rating is not None:
                numerator += sim * rating
                denominator += abs(sim)

        if denominator > 0:
            predicted[food_id] = numerator / denominator
        else:
            predicted[food_id] = 0.0

    # Normalise to [0, 1] and write back
    max_rating = 5.0
    for c in candidates:
        raw_pred = predicted.get(c.food_id, 0.0)
        c.collab_score = round(min(raw_pred / max_rating, 1.0), 4)

    return candidates