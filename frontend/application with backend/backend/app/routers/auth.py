from fastapi import APIRouter, status, HTTPException, Depends, Response
from fastapi.security import OAuth2PasswordRequestForm
from ..models import user, UserRole
from pydantic import BaseModel
from typing import Optional, Annotated
from sqlmodel import select
from ..dependencies import db_dependency, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, user_dependency
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from passlib.context import CryptContext
from jose import jwt
import logging

logging.getLogger('passlib').setLevel(logging.ERROR)

router = APIRouter(
    prefix='/auth',
    tags=['Auth']
)

bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

class Token(BaseModel):
    access_token: str
    token_type: str

class CreateUserRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str

class CreateUserResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: str
    created_at: datetime
    role: str
    premium_start: Optional[datetime]
    premium_end: Optional[datetime]
    suspended: bool

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# ← new response model for GET /auth/me
class CurrentUserResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: str
    role: str

def authenticate_user(email: str, password: str, db: db_dependency):
    db_user = db.exec(select(user).where(user.email == email)).first()
    if db_user is None:
        return None
    truncated_password = password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    if not bcrypt_context.verify(truncated_password, db_user.hashed_password):
        return None
    return db_user

def create_jwt(id: str, username: str, role: str, expires_delta: timedelta):
    encode = {'sub': username, 'id': id, 'role': role, 'exp': None}
    expires = datetime.now(ZoneInfo('Asia/Singapore')) + expires_delta
    encode['exp'] = expires
    if SECRET_KEY is None or ALGORITHM is None:
        raise HTTPException(status_code=500, detail="JWT configuration missing")
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post('/', status_code=status.HTTP_201_CREATED, response_model=CreateUserResponse)
async def create_user(db: db_dependency, new_user: CreateUserRequest):
    email_exists = db.exec(
        select(user).where(user.email == new_user.email)
    ).first()

    if email_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Email already exists'
        )

    try:
        truncated_password = new_user.password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
        new_db_user = user(
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            email=new_user.email,
            hashed_password=bcrypt_context.hash(truncated_password),
            role=UserRole.freemium
        )
        db.add(new_db_user)
        db.commit()
        db.refresh(new_db_user)
        return new_db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post('/token', response_model=Token, status_code=status.HTTP_200_OK)
async def login_for_access_token(
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: db_dependency
):
    db_user = authenticate_user(form_data.username, form_data.password, db)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    token = create_jwt(
        str(db_user.user_id), db_user.email, db_user.role,
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    response.set_cookie(
        key="access_token",
        value=token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=False,
        secure=False,
        samesite="lax",
        path='/'
    )

    return {'access_token': token, 'token_type': 'bearer', 'expires_in': ACCESS_TOKEN_EXPIRE_MINUTES * 60}

@router.post('/logout', status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, current_user: user_dependency):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token'
        )
    response.delete_cookie(key="access_token")
    return

@router.put('/change-password', status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    password_data: ChangePasswordRequest,
    db: db_dependency,
    current_user: user_dependency
):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token'
        )

    db_user = db.exec(
        select(user).where(user.user_id == current_user['id'])
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )

    if not bcrypt_context.verify(password_data.current_password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Current password is incorrect'
        )

    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='New password must be different from current password'
        )

    truncated_password = password_data.new_password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    db_user.hashed_password = bcrypt_context.hash(truncated_password)

    try:
        db.add(db_user)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return

@router.delete('/delete-account', status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    db: db_dependency,
    current_user: user_dependency
):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token'
        )

    db_user = db.exec(
        select(user).where(user.user_id == current_user['id'])
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )

    try:
        db.delete(db_user)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return

# ← new endpoint to get current user's name and email
@router.get('/me', response_model=CurrentUserResponse, status_code=status.HTTP_200_OK)
async def get_current_user_info(
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

    return CurrentUserResponse(
        user_id=db_user.user_id,
        first_name=db_user.first_name,
        last_name=db_user.last_name,
        email=db_user.email,
        role=db_user.role,
    )