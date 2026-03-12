from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import User, UserProfile


router = APIRouter(
    prefix='/account',
    tags=['Account']
)


@router.delete('/me', status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    db: db_dependency,
    user: user_dependency
):
    db_user = db.exec(
        select(User).where(User.user_id == int(user['id']))
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )

    user_profile = db.exec(
        select(UserProfile).where(UserProfile.user_id == int(user['id']))
    ).first()

    try:
        if user_profile is not None:
            db.delete(user_profile)

        db.delete(db_user)
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )