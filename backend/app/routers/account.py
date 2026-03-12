from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, user_profile, user_preferences


router = APIRouter(
    prefix='/account',
    tags=['Account']
)


@router.delete('/me', status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    db: db_dependency,
    current_user: user_dependency
):
    db_user = db.exec(
        select(user).where(user.user_id == int(current_user['id']))
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )

    profile = db.exec(
        select(user_profile).where(user_profile.user_id == int(current_user['id']))
    ).first()

    preferences = db.exec(
        select(user_preferences).where(user_preferences.user_id == int(current_user['id']))
    ).first()

    try:
        if preferences is not None:
            db.delete(preferences)

        if profile is not None:
            db.delete(profile)

        db.delete(db_user)
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )