import pytest
from .utils import *
from app.routers.auth import authenticate_user, bcrypt_context
from app.dependencies import SECRET_KEY, ALGORITHM, get_current_user, get_db
from fastapi import status, HTTPException
from jose import JWTError, ExpiredSignatureError

def test_authenticate_user_success(client, db_session):

    test_user = create_test_user(db_session)
    authenticated_user = authenticate_user(
        email='test@nutritrack.com',
        password='testpassword',
        db=db_session
    )
    assert authenticated_user is not None
    assert authenticated_user.email == test_user.email
    assert authenticated_user.hashed_password == test_user.hashed_password

def test_authenticate_user_fail(client, db_session):

    create_test_user(db_session)
    wrong_email_user = authenticate_user(
        email='wrongemail@nutritrack.com',
        password='testpassword',
        db=db_session
    )
    assert wrong_email_user is None

    wrong_password_user = authenticate_user(
        email='test@nutritrack.com',
        password='wrongpassword',
        db=db_session
    )
    assert wrong_password_user is None

def test_create_jwt_success(
        id='1',
        email='test@nutritrack.com',
        role='freemium',
        expires_delta=timedelta(minutes=5)
    ):
    
    test_access_token = create_jwt(
        id=id,
        username=email,
        role=role,
        expires_delta=expires_delta
    )
    assert test_access_token is not None

    test_payload = jwt.decode(
        test_access_token,
        SECRET_KEY,
        algorithms=[ALGORITHM])
    assert test_payload['id'] == id
    assert test_payload['sub'] == email
    assert test_payload['role'] == role

def test_create_jwt_expired():
    
    expired_access_token = create_jwt(
        id='1',
        username='test@email.com',
        role='freemium',
        expires_delta=timedelta(minutes=-1)
    )

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(expired_access_token)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == 'Token has expired'

def test_register_new_user(client):

    response = client.post('/auth/', json={
    "first_name": "John",
    "last_name": "Doe",
    "email": "jd@test.com",
    "password": "test"
    })

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data['first_name'] == 'John'
    assert data['last_name'] == 'Doe'
    assert data['email'] == 'jd@test.com'
    assert data['role'] == 'freemium'
    assert 'hashed_password' not in data
    assert data['suspended'] == False

def test_register_new_user_duplicate(client, db_session):

    create_test_user(db_session, email='dupe@test.com')
    response = client.post('/auth/', json={
    "first_name": "John",
    "last_name": "Doe",
    "email": "dupe@test.com",
    "password": "test"
    })

    assert response.status_code == status.HTTP_409_CONFLICT

def test_register_new_user_missing_fields(client):

    response = client.post('/auth/', json={
        "email": "missing@mail.com"
    })
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_login_success(client, db_session):

    create_test_user(db_session)

    response = client.post('/auth/token/', data={
        "username": "test@nutritrack.com",
        "password": "testpassword"
    })

    assert response.status_code == status.HTTP_200_OK
    assert 'access_token' in response.json()

def test_login_wrong_password(client, db_session):

    create_test_user(db_session)

    response = client.post('/auth/token/', data={
        "username": "test@nutritrack.com",
        "password": "wrongpassword"
    })

    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_login_nonexistent_email(client, db_session):

    create_test_user(db_session)

    response = client.post('/auth/token/', data={
        "username": "invalid@mail.com",
        "password": "testpassword"
    })

    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_logout_success(client, db_session):

    create_test_user(db_session)

    response = client.post('/auth/logout/',
        headers=get_auth_headers())

    assert response.status_code == status.HTTP_204_NO_CONTENT

def test_logout_no_token(client):

    response = client.post('/auth/logout/')

    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_change_password_success(client, db_session):

    test_user = create_test_user(db_session)

    response = client.put('/auth/change-password', json={
        "current_password": "testpassword",
        "new_password": "testpassword2"
    }, headers=get_auth_headers(
        user_id=test_user.user_id,
        email=test_user.email
    ))

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert bcrypt_context.verify("testpassword2", test_user.hashed_password)

def test_change_password_user_not_found(client):

    response = client.put('/auth/change-password', json={
        "current_password": "testpassword",
        "new_password": "testpassword2"
    }, headers=get_auth_headers())

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert 'User not found'

def test_change_password_incorrect_password(client, db_session):

    test_user = create_test_user(db_session)

    response = client.put('/auth/change-password', json={
        "current_password": "wrongpassword",
        "new_password": "testpassword2"
    }, headers=get_auth_headers(
        user_id=test_user.user_id,
        email=test_user.email
    ))

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert 'Current password is incorrect'

def test_change_password_same_password(client, db_session):

    test_user = create_test_user(db_session)

    response = client.put('/auth/change-password', json={
        "current_password": "testpassword",
        "new_password": "testpassword"
    }, headers=get_auth_headers(
        user_id=test_user.user_id,
        email=test_user.email
    ))

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'New password must be different from current password'