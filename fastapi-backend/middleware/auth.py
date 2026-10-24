import os
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from services import auth_service

# auto_error=False so a missing header yields our 401 (not FastAPI's default 403)
security = HTTPBearer(auto_error=False)

UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authorized, token invalid or expired",
    headers={"WWW-Authenticate": "Bearer"},
)


async def _authenticate(credentials, allowed_types: set):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UNAUTHORIZED
    payload = auth_service.decode_token(credentials.credentials, allowed_types)
    if payload is None:
        raise UNAUTHORIZED
    user = await auth_service.get_user_for_token(payload)
    if user is None:
        raise UNAUTHORIZED
    return user, payload


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Full account access: only short-lived access tokens are accepted."""
    user, _ = await _authenticate(credentials, {"access"})
    return user


async def get_activity_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Activity endpoints also accept the browser extension's scoped token."""
    user, payload = await _authenticate(credentials, {"access", "extension"})
    if payload["type"] == "extension" and payload.get("scope") != auth_service.EXTENSION_SCOPE:
        raise UNAUTHORIZED
    return user


def allowed_origins() -> set:
    defaults = {"http://localhost:6501", "http://localhost:5173", "http://127.0.0.1:6501", "http://127.0.0.1:5173"}
    extra = {o.strip().rstrip("/") for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()}
    frontend = os.getenv("FRONTEND_URL", "").rstrip("/")
    return defaults | extra | ({frontend} if frontend else set())


async def require_csrf_header(request: Request):
    """CSRF guard for endpoints authenticated by the refresh cookie.

    Browsers only let a page add a custom header after a CORS preflight, which only our allowed origins
    pass, so a forged cross-site request can't include it. The Origin check is a second layer.
    """
    if request.headers.get("x-requested-with") != "XMLHttpRequest":
        raise HTTPException(status_code=403, detail="Missing CSRF header")
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") not in allowed_origins():
        raise HTTPException(status_code=403, detail="Origin not allowed")
