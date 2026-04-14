from typing import Optional

from fastapi import APIRouter, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, FoodSource
from ..services.image_recognition_service import ImageRecognitionService


router = APIRouter(
    prefix="/image-recognition",
    tags=["Image Recognition"]
)


class ImagePredictionResponse(BaseModel):
    name: str
    confidence: float


class ImageRecognitionResponse(BaseModel):
    predictions: list[ImagePredictionResponse]


def get_current_db_user(
    db: db_dependency,
    current_user: user_dependency
) -> user:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    db_user = db.exec(
        select(user).where(user.user_id == int(current_user["id"]))
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return db_user


@router.post(
    "/analyze",
    response_model=ImageRecognitionResponse,
    status_code=status.HTTP_200_OK
)
async def analyze_food_image(
    image: UploadFile = File(...),
    db: db_dependency = None,
    current_user: user_dependency = None
):
    get_current_db_user(db, current_user)

    allowed_content_types = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
    max_file_size_bytes = 5 * 1024 * 1024  # 5MB

    if image.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, and WEBP images are supported"
        )

    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty"
        )

    if len(image_bytes) > max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file is too large. Maximum size is 5MB"
        )

    try:
        service = ImageRecognitionService()
        predictions = service.recognize_foods_from_image(
            image_bytes=image_bytes,
            filename=image.filename or "food_image.jpg",
            content_type=image.content_type or "image/jpeg"
        )

        return ImageRecognitionResponse(predictions=predictions)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )