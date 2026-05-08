import os
import json
import hashlib
from typing import Optional

import requests
import redis
from fastapi import HTTPException, status

_USDA_BASE = "https://api.nal.usda.gov/fdc/v1"
_CACHE_TTL = 86400  # 24 hours
_redis_client: Optional[redis.Redis] = None


def _get_redis() -> Optional[redis.Redis]:
    """
    Returns a Redis client, or None if Redis is unreachable.
    Degrades gracefully — the service still functions without the cache.

    Returns:
        Optional[redis.Redis]: Connected client or None.
    """
    global _redis_client
    if _redis_client is None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            client = redis.from_url(url, decode_responses=True)
            client.ping()
            _redis_client = client
        except Exception:
            _redis_client = None
    return _redis_client


def _cache_key(ingredient_name: str) -> str:
    digest = hashlib.md5(ingredient_name.lower().strip().encode()).hexdigest()[:10]
    return f"usda:v1:{digest}"


def get_nutrition_per_100g(ingredient_name: str) -> Optional[dict]:
    """
    Fetches raw nutritional data per 100g for an ingredient from USDA
    FoodData Central. Caches the per-100g result in Redis.

    Uses the Foundation and SR Legacy data types, which are the most
    reliable for generic, non-branded ingredients.

    Args:
        ingredient_name (str): Human-readable ingredient (e.g. "white rice").

    Returns:
        Optional[dict]: Nutrition dict with keys calories, protein_g, carb_g,
                        fat_g, sugar_g, fiber_g, sodium_mg — or None if not found.

    Raises:
        HTTPException: If USDA_API_KEY is not configured.
    """
    api_key = os.getenv("USDA_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="USDA_API_KEY is not configured",
        )

    cache = _get_redis()
    key = _cache_key(ingredient_name)

    if cache:
        hit = cache.get(key)
        if hit:
            return json.loads(hit)

    # Reason: wrap the network call in a broad try/except so that any
    # transport-level failure (timeout, DNS error, unexpected exception)
    # degrades gracefully and lets get_nutrition_scaled() return zeros
    # instead of surfacing a 500 to the caller.
    try:
        resp = requests.get(
            f"{_USDA_BASE}/foods/search",
            params={
                "api_key": api_key,
                "query": ingredient_name,
                "dataType": "Foundation,SR Legacy",
                "pageSize": 1,
            },
            timeout=10,
        )
    except Exception:
        return None

    if resp.status_code != 200 or not resp.json().get("foods"):
        return None

    food = resp.json()["foods"][0]
    nutrients = {n["nutrientName"]: n.get("value", 0.0) for n in food.get("foodNutrients", [])}

    per_100g = {
        "calories":  float(nutrients.get("Energy", 0.0)),
        "protein_g": float(nutrients.get("Protein", 0.0)),
        "carb_g":    float(nutrients.get("Carbohydrate, by difference", 0.0)),
        "fat_g":     float(nutrients.get("Total lipid (fat)", 0.0)),
        "sugar_g":   float(nutrients.get("Sugars, total including NLEA", 0.0)),
        "fiber_g":   float(nutrients.get("Fiber, total dietary", 0.0)),
        "sodium_mg": float(nutrients.get("Sodium, Na", 0.0)),
    }

    if cache:
        cache.setex(key, _CACHE_TTL, json.dumps(per_100g))

    return per_100g


def get_nutrition_scaled(ingredient_name: str, amount_g: float) -> dict:
    """
    Returns nutritional data for an ingredient scaled to the given gram weight.
    If USDA lookup fails, returns zero values rather than raising — the caller
    is responsible for communicating partial data to the user.

    Args:
        ingredient_name (str): Human-readable ingredient name.
        amount_g (float): Weight in grams to scale to.

    Returns:
        dict: Scaled nutrition dict. Values are 0.0 if USDA lookup failed.
    """
    per_100g = get_nutrition_per_100g(ingredient_name)
    if per_100g is None:
        return {k: 0.0 for k in ("calories", "protein_g", "carb_g", "fat_g", "sugar_g", "fiber_g", "sodium_mg")}
    factor = amount_g / 100.0
    return {k: round(v * factor, 2) for k, v in per_100g.items()}