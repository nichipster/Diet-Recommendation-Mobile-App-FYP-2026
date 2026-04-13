from .schemas import FoodCandidate, UserGoalContext, ScoredCandidate

EPSILON = 1e-6  # Prevents division by zero in ratio calculations


def _macro_match_score(
    candidate: FoodCandidate,
    ctx: UserGoalContext
) -> float:
    """
    Computes a [0, 1] score reflecting how closely the candidate's
    macro profile matches the user's remaining macro targets.

    A score of 1.0 means a perfect match; 0.0 means extreme deviation.

    Args:
        candidate (FoodCandidate): The food item being scored.
        ctx (UserGoalContext): User's remaining macro budget.

    Returns:
        float: Macro match score in [0, 1].
    """
    targets = [
        ctx.remaining_protein_g,
        ctx.remaining_carb_g,
        ctx.remaining_fat_g,
    ]
    actuals = [
        candidate.protein_g,
        candidate.carb_g,
        candidate.fat_g,
    ]

    deviations = []
    for actual, target in zip(actuals, targets):
        # Reason: If target is negative (budget exceeded), we treat it as
        # zero to avoid inverted scoring where negative targets reward
        # higher consumption.
        effective_target = max(target, 0.0)
        deviation = abs(actual - effective_target) / (effective_target + EPSILON)
        deviations.append(deviation)

    mean_deviation = sum(deviations) / len(deviations)
    return 1.0 / (1.0 + mean_deviation)


def _calorie_proximity_score(
    candidate: FoodCandidate,
    remaining_calories: float
) -> float:
    """
    Computes a [0, 1] score for how close the candidate's calories are
    to the remaining calorie budget.

    Items perfectly filling the remaining budget score 1.0.
    Items far above or below score closer to 0.0.

    Args:
        candidate (FoodCandidate): The food item being scored.
        remaining_calories (float): Remaining calorie budget for the user today.

    Returns:
        float: Calorie proximity score in [0, 1].
    """
    effective_target = max(remaining_calories, 0.0)
    raw = 1.0 - abs(candidate.calories - effective_target) / (effective_target + EPSILON)
    return max(0.0, raw)


def _goal_type_modifier(
    candidate: FoodCandidate,
    goal_type: str
) -> float:
    """
    Applies a small multiplier based on the user's dietary goal type.

    - lose:     Prefer lower-calorie, higher-protein items (satiety + deficit)
    - gain:     Prefer higher-calorie, higher-protein items (surplus)
    - maintain: Neutral — no modifier applied

    Args:
        candidate (FoodCandidate): The food item being scored.
        goal_type (str): "lose" | "maintain" | "gain"

    Returns:
        float: A modifier in [0.8, 1.2] applied to the final content score.
    """
    if goal_type == "lose":
        # Reward low-calorie, high-protein items
        if candidate.calories < 300 and candidate.protein_g > 15:
            return 1.15
        if candidate.calories > 600:
            return 0.85
        return 1.0

    if goal_type == "gain":
        # Reward calorie-dense, protein-rich items
        if candidate.calories > 400 and candidate.protein_g > 20:
            return 1.15
        return 1.0

    return 1.0  # maintain: neutral


def compute_content_scores(
    candidates: list[FoodCandidate],
    ctx: UserGoalContext,
    macro_weight: float = 0.6,
    calorie_weight: float = 0.4
) -> list[ScoredCandidate]:
    """
    Computes content-based scores for each candidate.

    The final content score is a weighted sum of:
    - Macro match score (default 60%)
    - Calorie proximity score (default 40%)

    A goal-type modifier is then applied multiplicatively.

    Args:
        candidates (list[FoodCandidate]): Filtered food item candidates.
        ctx (UserGoalContext): User's remaining macro/calorie budget.
        macro_weight (float): Weight for macro match component (default 0.6).
        calorie_weight (float): Weight for calorie proximity component (default 0.4).

    Returns:
        list[ScoredCandidate]: Candidates with content_score populated.
    """
    scored = []

    for c in candidates:
        macro_s = _macro_match_score(c, ctx)
        cal_s = _calorie_proximity_score(c, ctx.remaining_calories)
        base_score = macro_weight * macro_s + calorie_weight * cal_s
        modifier = _goal_type_modifier(c, ctx.goal_type)
        final_content = min(base_score * modifier, 1.0)

        scored.append(
            ScoredCandidate(
                food_id=c.food_id,
                name=c.name,
                calories=c.calories,
                protein_g=c.protein_g,
                carb_g=c.carb_g,
                fat_g=c.fat_g,
                content_score=round(final_content, 4),
            )
        )

    return scored