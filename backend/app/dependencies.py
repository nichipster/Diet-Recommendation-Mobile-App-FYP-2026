from .database import engine
from sqlmodel import Session
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError, ExpiredSignatureError
from dotenv import load_dotenv
import os 

# JWT configuration
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")

if RESEND_API_KEY is None:
    raise RuntimeError("RESEND_API_KEY environment variable is not set")

# token expiration
access_token_expire_minutes_str = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
if access_token_expire_minutes_str is None:
    raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES environment variable is not set")
ACCESS_TOKEN_EXPIRE_MINUTES = int(access_token_expire_minutes_str)

# OAuth2 bearer for token authentication
oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')

def get_db():
    with Session(engine) as db:
        yield db

# database dependency
db_dependency = Annotated[Session, Depends(get_db)]

# validate token
def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]):
    if SECRET_KEY is None or ALGORITHM is None:
        raise HTTPException(status_code=500, detail="JWT configuration missing")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        id = payload['id']
        username = payload['sub']
        role = payload['role']
        if id is None or username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        return {'id':id, 'username':username, 'role':role}
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token has expired')
    except JWTError:
        raise HTTPException(status_code=401, detail='Invalid token')

# User dependency
user_dependency = Annotated[dict, Depends(get_current_user)]

# Admin dependency
def require_admin(
    current_user: Annotated[dict, Depends(get_current_user)]
) -> dict:
    """
    Dependency that asserts the authenticated user holds the admin role.

    Raises HTTP 403 for any authenticated non-admin caller so that the
    403 is distinct from 401 (unauthenticated) in client error handling.

    Args:
        current_user (dict): Decoded JWT payload from get_current_user.

    Returns:
        dict: The same payload, passed through unchanged.

    Raises:
        HTTPException: 403 if role is not admin.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


admin_dependency = Annotated[dict, Depends(require_admin)]