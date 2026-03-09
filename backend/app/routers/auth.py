from fastapi import APIRouter, status, HTTPException, Depends, Response
from ..models import User, UserRole
from pydantic import BaseModel
from typing import Optional
from sqlmodel import select
from ..dependencies import db_dependency
from datetime import datetime
from passlib.context import CryptContext

router = APIRouter(
    prefix='/auth',
    tags=['Auth']
)

# To hash password for user creation
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

# Base Models

class CreateUserRequest(BaseModel):
    first_name : str
    last_name : str
    phone_number : Optional[str] = None
    email : str
    password : str

class CreateUserResponse(BaseModel):
    user_id : int 
    first_name : str 
    last_name : str
    phone_number : Optional[str]
    hashed_password : str
    created_at : datetime
    role : str 
    premium_start : Optional[datetime]
    premium_end : Optional[datetime]
    suspended : bool 

# endpoints

@router.post('/', status_code=status.HTTP_201_CREATED, response_model=CreateUserResponse)
async def create_user(db:db_dependency, new_user:CreateUserRequest):

    email_exists = db.exec(
        select(User).where(
            User.email == new_user.email)
        ).first()
    
    if email_exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail='Email already exists')
    
    try:
        new_db_user = User(
            first_name = new_user.first_name,
            last_name = new_user.last_name,
            email = new_user.email,
            phone_number = new_user.phone_number,
            hashed_password = bcrypt_context.hash(new_user.password),
            role = UserRole.freemium
        )
        db.add(new_db_user)
        db.commit()
        db.refresh(new_db_user)
        return new_db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=str(e))