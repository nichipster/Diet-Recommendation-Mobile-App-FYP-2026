PORTION_DEFAULTS_G: dict[str, float] = {
    "apple_pie": 125.0, "baby_back_ribs": 200.0, "baklava": 60.0,
    "beef_carpaccio": 80.0, "beef_tartare": 100.0, "beet_salad": 150.0,
    "beignets": 80.0, "bibimbap": 350.0, "bread_pudding": 150.0,
    "breakfast_burrito": 200.0, "bruschetta": 80.0, "caesar_salad": 150.0,
    "cannoli": 85.0, "caprese_salad": 150.0, "carrot_cake": 100.0,
    "ceviche": 150.0, "cheesecake": 100.0, "cheese_plate": 100.0,
    "chicken_curry": 300.0, "chicken_quesadilla": 180.0, "chicken_wings": 200.0,
    "chocolate_cake": 100.0, "chocolate_mousse": 100.0, "churros": 80.0,
    "clam_chowder": 250.0, "club_sandwich": 200.0, "crab_cakes": 150.0,
    "creme_brulee": 120.0, "croque_madame": 200.0, "cup_cakes": 70.0,
    "deviled_eggs": 80.0, "donuts": 60.0, "dumplings": 150.0,
    "edamame": 100.0, "eggs_benedict": 200.0, "escargots": 100.0,
    "falafel": 150.0, "filet_mignon": 200.0, "fish_and_chips": 350.0,
    "foie_gras": 80.0, "french_fries": 150.0, "french_onion_soup": 300.0,
    "french_toast": 150.0, "fried_calamari": 150.0, "fried_rice": 300.0,
    "frozen_yogurt": 150.0, "garlic_bread": 70.0, "gnocchi": 200.0,
    "greek_salad": 200.0, "grilled_cheese_sandwich": 180.0, "grilled_salmon": 200.0,
    "guacamole": 100.0, "gyoza": 150.0, "hamburger": 220.0,
    "hot_and_sour_soup": 300.0, "hot_dog": 150.0, "huevos_rancheros": 250.0,
    "hummus": 100.0, "ice_cream": 100.0, "lasagna": 300.0,
    "lobster_bisque": 250.0, "lobster_roll_sandwich": 200.0,
    "macaroni_and_cheese": 250.0, "macarons": 50.0, "miso_soup": 250.0,
    "mussels": 200.0, "nachos": 200.0, "omelette": 150.0, "onion_rings": 100.0,
    "oysters": 100.0, "pad_thai": 300.0, "paella": 350.0, "pancakes": 150.0,
    "panna_cotta": 120.0, "peking_duck": 250.0, "pho": 500.0, "pizza": 200.0,
    "pork_chop": 200.0, "poutine": 350.0, "prime_rib": 250.0,
    "pulled_pork_sandwich": 220.0, "ramen": 500.0, "ravioli": 250.0,
    "red_velvet_cake": 100.0, "risotto": 300.0, "samosa": 100.0,
    "sashimi": 150.0, "scallops": 150.0, "seaweed_salad": 100.0,
    "shrimp_and_grits": 300.0, "spaghetti_bolognese": 350.0,
    "spaghetti_carbonara": 300.0, "spring_rolls": 150.0, "steak": 250.0,
    "strawberry_shortcake": 150.0, "sushi": 200.0, "tacos": 200.0,
    "takoyaki": 150.0, "tiramisu": 120.0, "tuna_tartare": 120.0, "waffles": 150.0,
}

_DEFAULT_G = 250.0


def get_portion_g(dish_class: str) -> float:
    """
    Returns the default serving weight in grams for a dish class.

    Args:
        dish_class (str): Food-101 class name in snake_case.

    Returns:
        float: Default gram weight. Falls back to 250g if not listed.
    """
    return PORTION_DEFAULTS_G.get(dish_class, _DEFAULT_G)