from fastapi import APIRouter, status, HTTPException, Depends, Response
from fastapi.security import OAuth2PasswordRequestForm
from ..models import user, UserRole, AuditLogType
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Annotated
from sqlmodel import select
from ..dependencies import db_dependency, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, user_dependency
from ..services.email_service import send_verification_email
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from passlib.context import CryptContext
from jose import jwt
from starlette.requests import Request
import random
from ..services.audit_service import log_event


router = APIRouter(
    prefix='/auth',
    tags=['Auth']
)

# To hash password for user creation
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

SG_TZ = ZoneInfo("Asia/Singapore")

# Base Models

class Token(BaseModel):
    access_token:str
    token_type:str

class CreateUserRequest(BaseModel):
    first_name : str
    last_name : str
    email : str
    password : str

class CreateUserResponse(BaseModel):
    user_id : int 
    first_name : str 
    last_name : str
    email : str
    created_at : datetime
    role : str 
    premium_start : Optional[datetime]
    premium_end : Optional[datetime]
    suspended : bool 
    email_verified: bool
    message: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8)

class ResendCodeRequest(BaseModel):
    email: EmailStr

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str

class MessageResponse(BaseModel):
    message: str

# =========================
# Helper functions
# =========================

# authenticate helper function
def authenticate_user(email:str, password:str, db:db_dependency):
    db_user = db.exec(select(user).where(user.email == email)).first()
    if db_user is None:
        return None
    if not bcrypt_context.verify(password, db_user.hashed_password):
        return None
    return db_user

# jwt
def create_jwt(id:str, username:str, role:str, expires_delta:timedelta):
    encode = {'sub':username, 'id':id, 'role':role, 'exp':None}
    expires = datetime.now(ZoneInfo('Asia/Singapore')) + expires_delta
    encode['exp'] = expires
    if SECRET_KEY is None or ALGORITHM is None:
        raise HTTPException(status_code=500, detail="JWT configuration missing")
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)


def generate_verification_code() -> str:
    return str(random.randint(100000, 999999))

def get_code_expiry_time() -> datetime:
    return datetime.now(SG_TZ) + timedelta(minutes=10)

def validate_password_length(password: str) -> None:
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long (max 72 bytes)"
        )

def validate_reset_code(db_user: user, code: str) -> None:
    if db_user.verification_code is None or db_user.verification_code_expires_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code found. Please request a new code."
        )

    if datetime.now(SG_TZ) > db_user.verification_code_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired"
        )

    if db_user.verification_code != code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )


# =========================
# Endpoints
# =========================

@router.post('/', status_code=status.HTTP_201_CREATED, response_model=CreateUserResponse)
async def create_user(db:db_dependency, new_user:CreateUserRequest):

    normalized_email = new_user.email.strip().lower()

    email_exists = db.exec(
        select(user).where(
            user.email == normalized_email)
        ).first()
    
    if email_exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail='Email already exists')
    
    try:
        new_db_user = user(
            first_name = new_user.first_name.strip(),
            last_name = new_user.last_name.strip(),
            email = normalized_email,
            hashed_password = bcrypt_context.hash(new_user.password),
            role = UserRole.freemium
        )
        db.add(new_db_user)
        db.commit()
        db.refresh(new_db_user)

        code = generate_verification_code()
        expiry = get_code_expiry_time()

        new_db_user.verification_code = code
        new_db_user.verification_code_expires_at = expiry

        db.add(new_db_user)
        db.commit()
        db.refresh(new_db_user)

        send_verification_email(new_db_user.email, code)

        return {
            "user_id": new_db_user.user_id,
            "first_name": new_db_user.first_name,
            "last_name": new_db_user.last_name,
            "email": new_db_user.email,
            "created_at": new_db_user.created_at,
            "role": new_db_user.role,
            "premium_start": new_db_user.premium_start,
            "premium_end": new_db_user.premium_end,
            "suspended": new_db_user.suspended,
            "email_verified": new_db_user.email_verified,
            "message": "Verification code sent to email"
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
            )
   

@router.post('/forgot-password', response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def forgot_password(request: ForgotPasswordRequest, db: db_dependency):
    normalized_email = request.email.strip().lower()

    db_user = db.exec(
        select(user).where(user.email == normalized_email)
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )

    try:
        code = generate_verification_code()
        expiry = get_code_expiry_time()

        db_user.verification_code = code
        db_user.verification_code_expires_at = expiry

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        send_verification_email(db_user.email, code)

        return {"message": "Password reset code sent to email"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post('/reset-password', response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def reset_password(request: ResetPasswordRequest, db: db_dependency):
    normalized_email = request.email.strip().lower()

    db_user = db.exec(
        select(user).where(user.email == normalized_email)
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )

    validate_password_length(request.new_password)
    validate_reset_code(db_user, request.code)

    if bcrypt_context.verify(request.new_password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='New password must be different from current password'
        )

    try:
        db_user.hashed_password = bcrypt_context.hash(request.new_password)
        db_user.verification_code = None
        db_user.verification_code_expires_at = None

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        return {"message": "Password reset successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    

# authenticates then creates jwt
@router.post('/token', response_model=Token, status_code=status.HTTP_200_OK)
async def login_for_access_token(
    request: Request,
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: db_dependency,
):


    ip = request.client.host if request.client else "unknown"
    db_user = authenticate_user(form_data.username, form_data.password, db)

    if db_user is None:
        # log before raising so the record persists even though
        # we are about to return 401. Use the attempted username as
        # admin_email — it is the only identity available at this point.
        log_event(
            db,
            action="failed_login",
            detail=f"Failed login attempt for '{form_data.username}'",
            log_type=AuditLogType.warning,
            admin_email=form_data.username,
            ip_address=ip,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    token = create_jwt(
        str(db_user.user_id),
        db_user.email,
        db_user.role,
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    if db_user.role == UserRole.admin:
        log_event(
            db,
            action="admin_login",
            detail=f"Admin '{db_user.email}' logged in",
            log_type=AuditLogType.auth,
            admin_email=db_user.email,
            ip_address=ip,
        )

    response.set_cookie(
        key="access_token",
        value=token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=False,
        secure=False,
        samesite="lax",
        path="/",
    )

    return {"access_token": token, "token_type": "bearer", "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60}

# logout
@router.post('/logout', status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, current_user: user_dependency, db: db_dependency):
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')

    if current_user.get("role") == "admin":
        from ..services.audit_service import log_event
        from ..models import AuditLogType

        log_event(
            db,
            action="admin_logout",
            detail=f"Admin '{current_user['username']}' logged out",
            log_type=AuditLogType.auth,
            admin_email=current_user["username"],
            ip_address=request.client.host if request.client else "unknown",
        )

    response.delete_cookie(key="access_token")
    return

# change password
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
        select(user).where(user.user_id == int(current_user['id']))
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

    db_user.hashed_password = bcrypt_context.hash(password_data.new_password)

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



@router.post('/resend-code', response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def resend_verification_code(request: ResendCodeRequest, db: db_dependency):
    db_user = db.exec(
        select(user).where(user.email == request.email.strip().lower())
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )

    if db_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Email is already verified'
        )

    try:
        code = generate_verification_code()
        expiry = get_code_expiry_time()

        db_user.verification_code = code
        db_user.verification_code_expires_at = expiry

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        send_verification_email(db_user.email, code)

        return {"message": "Verification code resent"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post('/verify-code', response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def verify_email_code(request: VerifyCodeRequest, db: db_dependency):
    db_user = db.exec(
        select(user).where(user.email == request.email.strip().lower())
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )

    if db_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Email is already verified'
        )

    if db_user.verification_code is None or db_user.verification_code_expires_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No verification code found. Please request a new code.'
        )

    if datetime.now(SG_TZ) > db_user.verification_code_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Verification code has expired'
        )

    if db_user.verification_code != request.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Invalid verification code'
        )

    try:
        db_user.email_verified = True
        db_user.verification_code = None
        db_user.verification_code_expires_at = None

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        return {"message": "Email verified successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )