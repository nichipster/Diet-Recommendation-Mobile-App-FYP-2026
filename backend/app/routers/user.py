from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select
from typing import Optional

from ..dependencies import db_dependency, user_dependency

from ..models import user

router = APIRouter(
    prefix="/user",
    tags=["User"]
)

class CurrentUserResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email:str
    role:str

class UpdateUserInfoRequest(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

@router.get('/me', response_model=CurrentUserResponse, status_code=status.HTTP_200_OK)
async def get_current_user_info(db:db_dependency, current_user:user_dependency):

    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token'
        )
    
    db_user = db.exec(
        select(user).where(user.user_id == int(current_user['id']))
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )
    
    return {
        'user_id': db_user.user_id,
        'first_name': db_user.first_name,
        'last_name': db_user.last_name,
        'email': db_user.email,
        'role': db_user.role
    }

@router.put('/change-info', status_code=status.HTTP_204_NO_CONTENT)
async def change_user_info(
    user_data:UpdateUserInfoRequest,
    db:db_dependency, 
    current_user:user_dependency
    ):

    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token'
        )    

    db_user = db.exec(
        select(user).where(user.user_id == int(current_user['id']))
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )
    update = user_data.model_dump(exclude_unset=True)
    for field, value in update.items():
        setattr(db_user, field, value)

    try:
        db.add(db_user)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    