from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select

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

class ChangeEmailRequest(BaseModel):
    new_email: str

class ChangeNameRequest(BaseModel):
    new_first_name: str
    new_last_name: str

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

@router.put('/change-email', status_code=status.HTTP_204_NO_CONTENT)
async def change_user_email(email_data:ChangeEmailRequest, db:db_dependency, current_user:user_dependency):

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
    
    if email_data.new_email is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='New email cannot be empty'
        )
    
    if db_user.email == email_data.new_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='New email must be different from current email'
        )
    
    email_exists = db.exec(
        select(user).where(
            user.email == email_data.new_email)
        ).first()
    
    if email_exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail='Email already exists')
    
    db_user.email = email_data.new_email
    try:
        db.add(db_user)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
@router.put('/change-name', status_code=status.HTTP_204_NO_CONTENT)
async def change_user_name(name_data:ChangeNameRequest, db:db_dependency, current_user:user_dependency):

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
    
    if name_data.new_first_name is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='First name cannot be empty'
        )

    if name_data.new_last_name is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Last name cannot be empty'
        )
    
    current_full_name = db_user.first_name.lower() + db_user.last_name.lower()
    new_full_name = name_data.new_first_name.lower() + name_data.new_last_name.lower()

    if current_full_name == new_full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='New name cannot be same as current name'
        )
    
    db_user.first_name = name_data.new_first_name
    db_user.last_name = name_data.new_last_name

    try:
        db.add(db_user)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )