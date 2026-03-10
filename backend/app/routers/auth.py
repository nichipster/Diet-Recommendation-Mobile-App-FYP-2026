from fastapi import APIRouter, status, HTTPException, Depends, Response
from fastapi.security import OAuth2PasswordRequestForm
from ..models import User, UserRole
from pydantic import BaseModel
from typing import Optional, Annotated
from sqlmodel import select
from ..dependencies import db_dependency, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, user_dependency
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from passlib.context import CryptContext
from jose import jwt

router = APIRouter(
    prefix='/auth',
    tags=['Auth']
)

# To hash password for user creation
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

# Base Models

class Token(BaseModel):
    access_token:str
    token_type:str

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

# authenticate helper function
def authenticate_user(email:str, password:str, db:db_dependency):
    user = db.exec(select(User).where(User.email == email)).first()
    if user is None:
        return None
    if not bcrypt_context.verify(password, user.hashed_password):
        return None
    return user

# jwt
def create_jwt(id:str, username:str, role:str, expires_delta:timedelta):
    encode = {'sub':username, 'id':id, 'role':role, 'exp':None}
    expires = datetime.now(ZoneInfo('Asia/Singapore')) + expires_delta
    encode['exp'] = expires
    if SECRET_KEY is None or ALGORITHM is None:
        raise HTTPException(status_code=500, detail="JWT configuration missing")
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)

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
    

# authenticates then creates jwt
@router.post('/token', response_model=Token, status_code=status.HTTP_200_OK)
async def login_for_access_token(response:Response, form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db:db_dependency):

    user = authenticate_user(form_data.username, form_data.password, db)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    token = create_jwt(str(user.user_id), user.email, user.role,
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES*60,
        httponly=False,
        secure=False,
        samesite="lax",
        path='/'
    )

    return {'access_token':token, 'token_type':'bearer', 'expires_in': ACCESS_TOKEN_EXPIRE_MINUTES*60}

# logout
@router.post('/logout', status_code=status.HTTP_204_NO_CONTENT)
def logout(response:Response, user:user_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')
    response.delete_cookie(key="access_token")
    return