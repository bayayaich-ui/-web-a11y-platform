from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
import re

from app.database.database import get_db
from app.database.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse
from app.services.auth import create_session_token, hash_password, read_session_token, verify_password

router = APIRouter(prefix='/api/auth', tags=['auth'])
SESSION_COOKIE = 'a11y_session'


def set_session(response: Response, user: User) -> None:
    response.set_cookie(SESSION_COOKIE, create_session_token(user.id), httponly=True, secure=False, samesite='lax', max_age=7 * 24 * 60 * 60)


@router.post('/register', response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
        raise HTTPException(status_code=422, detail='Adresse e-mail invalide.')
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail='Cette adresse e-mail est déjà utilisée.')
    user = User(email=email, name=payload.name.strip(), password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    set_session(response, user)
    return user


@router.post('/login', response_model=UserResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Adresse e-mail ou mot de passe incorrect.')
    set_session(response, user)
    return user


@router.post('/logout', status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE)


def get_current_user(session: str | None = Cookie(default=None, alias=SESSION_COOKIE), db: Session = Depends(get_db)) -> User:
    user_id = read_session_token(session)
    user = db.get(User, user_id) if user_id else None
    if not user:
        raise HTTPException(status_code=401, detail='Authentification requise.')
    return user