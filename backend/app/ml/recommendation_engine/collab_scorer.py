from collections import defaultdict
from math import sqrt

from sqlmodel import Session, select

from .schemas import ScoredRecipe


def _build_user_recipe_matrix(
    db: Session,
    target_user_id: int
) -> tuple[dict[int, dict[int, float]], dict[int, float]]:
    """
    Builds a user-recipe interaction matrix from recommendation_log.

    Interaction signal priority (highest to lowest):
    1. Explicit rating in recommendation_log.rating (1-5 scale)
    2. was_accepted=True → treated as implicit rating of 4.0
    3. was_accepted=False (shown but not selected) → treated as 1.0

    Only rows where the recommendation was shown (i.e., was_accepted is not
    None) contribute to the matrix. Rows that were accepted AND rated use
    the explicit rating directly.

    Args:
        db (Session): SQLModel database session.
        target_user_id (int): The user requesting recommendations.

    Returns:
        tuple:
            - user_recipe: {user_id: {recipe_id: implicit_rating}}
            - target_vector: {recipe_id: rating} for the target user only
    """
    from app.models import recommendation_log as rec_log

    logs = db.exec(select(rec_log)).all()

    # {user_id: {recipe_id: [signals]}}
    raw: dict[int, dict[int, list[float]]] = defaultdict(lambda: defaultdict(list))

    for log in logs:
        if log.rating is not None:
            signal = float(log.rating)
        elif log.was_accepted:
            signal = 4.0   # Implicit strong positive
        else:
            signal = 1.0   # Implicit weak negative (shown but ignored)

        raw[log.user_id][log.recipe_id].append(signal)

    user_recipe: dict[int, dict[int, float]] = {
        uid: {rid: sum(signals) / len(signals) for rid, signals in recipes.items()}
        for uid, recipes in raw.items()
    }

    target_vector = user_recipe.get(target_user_id, {})
    return user_recipe, target_vector


def _cosine_similarity(
    vec_a: dict[int, float],
    vec_b: dict[int, float]
) -> float:
    """
    Computes cosine similarity between two sparse rating vectors.

    Args:
        vec_a (dict[int, float]): {recipe_id: rating} for user A.
        vec_b (dict[int, float]): {recipe_id: rating} for user B.

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
    candidates: list[ScoredRecipe],
    top_k_neighbors: int = 20,
    min_similarity: float = 0.1
) -> list[ScoredRecipe]:
    """
    Enriches each ScoredRecipe with a collaborative filtering score.

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
        candidates (list[ScoredRecipe]): Candidates to score.
        top_k_neighbors (int): Number of similar users to consider.
        min_similarity (float): Minimum similarity threshold to include a neighbor.

    Returns:
        list[ScoredRecipe]: Candidates with collab_score populated.
    """
    user_item, target_vector = _build_user_recipe_matrix(db, target_user_id)

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
    candidate_ids = {c.recipe_id for c in candidates}

    predicted: dict[int, float] = {}
    for recipe_id in candidate_ids:
        numerator = 0.0
        denominator = 0.0
        for uid, sim in top_neighbors:
            rating = user_item[uid].get(recipe_id)
            if rating is not None:
                numerator += sim * rating
                denominator += abs(sim)

        if denominator > 0:
            predicted[recipe_id] = numerator / denominator
        else:
            predicted[recipe_id] = 0.0

    # Normalise to [0, 1] and write back
    max_rating = 5.0
    for c in candidates:
        raw_pred = predicted.get(c.recipe_id, 0.0)
        c.collab_score = round(min(raw_pred / max_rating, 1.0), 4)

    return candidates