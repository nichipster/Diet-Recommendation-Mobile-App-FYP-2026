import os
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import HTTPException, status


load_dotenv()


class ImageRecognitionService:
    BASE_URL = "https://api.spoonacular.com"

    def __init__(self) -> None:
        self.api_key = os.getenv("SPOONACULAR_API_KEY")
        if not self.api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SPOONACULAR_API_KEY is not configured"
            )

    def _post_image(
        self,
        endpoint: str,
        image_bytes: bytes,
        filename: str,
        content_type: str
    ) -> dict:
        response = requests.post(
            f"{self.BASE_URL}{endpoint}",
            params={"apiKey": self.api_key},
            files={
                "file": (filename, image_bytes, content_type)
            },
            timeout=60
        )

        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Spoonacular image request failed: {response.text}"
            )

        return response.json()

    def classify_image(
        self,
        image_bytes: bytes,
        filename: str,
        content_type: str
    ) -> list[dict]:
        result = self._post_image(
            endpoint="/food/images/classify",
            image_bytes=image_bytes,
            filename=filename,
            content_type=content_type
        )

        categories = result.get("categories", []) or []

        predictions = []
        for item in categories:
            name = item.get("name")
            probability = item.get("probability")

            if name:
                predictions.append(
                    {
                        "name": name,
                        "confidence": round(float(probability or 0), 4)
                    }
                )

        return predictions[:5]

    def recognize_foods_from_image(
        self,
        image_bytes: bytes,
        filename: str,
        content_type: str
    ) -> list[dict]:
        return self.classify_image(
            image_bytes=image_bytes,
            filename=filename,
            content_type=content_type
        )