import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from jose import jwt
from models.user import User
from middleware.auth import get_current_user
import re

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "")
ALGORITHM = "HS256"


def generate_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=30)
    return jwt.encode({"id": user_id, "exp": expire}, JWT_SECRET, algorithm=ALGORITHM)


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register", status_code=201)
async def register_user(body: RegisterRequest):
    if not body.name or not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Name, email, and password are required")
    if len(body.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
    email_regex = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    if not email_regex.match(body.email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = await User.find_one(User.email == body.email.lower())
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    hashed = User.hash_password(body.password)
    user = User(name=body.name.strip(), email=body.email.lower(), password=hashed)
    await user.insert()

    return {
        "_id": str(user.id),
        "name": user.name,
        "email": user.email,
        "token": generate_token(str(user.id)),
    }


@router.post("/login")
async def login_user(body: LoginRequest):
    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = await User.find_one(User.email == body.email.lower())
    if not user or not user.verify_password(body.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "_id": str(user.id),
        "name": user.name,
        "email": user.email,
        "token": generate_token(str(user.id)),
    }


@router.get("/profile")
async def get_user_profile(current_user: User = Depends(get_current_user)):
    return {
        "_id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
    }
