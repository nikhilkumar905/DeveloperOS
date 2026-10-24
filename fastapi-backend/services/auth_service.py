"""Authentication primitives: JWT access/extension tokens, rotating refresh tokens, email OTPs.

Token model
-----------
* Access token  - JWT (HS256), 15 min, sent as `Authorization: Bearer`. Kept in memory by the SPA.
* Refresh token - 256-bit random value in an httpOnly, SameSite=Strict cookie scoped to /api/auth.
                  Stored only as a SHA-256 hash, rotated on every use; reuse of a rotated token
                  revokes the whole login family (stolen-token detection).
* Extension token - JWT limited to the activity scope, for the browser extension.
Every JWT carries the user's `tokenVersion`; bumping it revokes all outstanding tokens at once.
"""
import hashlib
import hmac
import os
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple

from beanie import PydanticObjectId
from fastapi import Request, Response
from jose import JWTError, jwt

from models.auth_tokens import EmailOtp, RefreshToken
from models.user import User

ALGORITHM = "HS256"
ISSUER = "developeros"
AUDIENCE = "developeros-api"

ACCESS_TOKEN_TTL = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_TTL_MIN", "15")))
REFRESH_TOKEN_TTL = timedelta(days=int(os.getenv("REFRESH_TOKEN_TTL_DAYS", "14")))
EXTENSION_TOKEN_TTL = timedelta(days=int(os.getenv("EXTENSION_TOKEN_TTL_DAYS", "90")))

OTP_TTL = timedelta(minutes=10)
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN = timedelta(seconds=60)

MAX_FAILED_LOGINS = 5
LOCKOUT_DURATION = timedelta(minutes=15)

REFRESH_COOKIE = "devos_refresh"
REFRESH_COOKIE_PATH = "/api/auth"

EXTENSION_SCOPE = "activity"


def is_production() -> bool:
    return (os.getenv("APP_ENV") or os.getenv("NODE_ENV") or "development").lower() == "production"


def jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET", "")
    if not secret:
        raise RuntimeError("JWT_SECRET is not set")
    return secret


def cookie_secure() -> bool:
    # Secure cookies need HTTPS; default on in production, off for http://localhost development
    return os.getenv("COOKIE_SECURE", "true" if is_production() else "false").lower() == "true"


# ─── JWTs ───────────────────────────────────────────────────────────────────

def _encode(claims: dict, ttl: timedelta) -> str:
    now = datetime.utcnow()
    payload = {**claims, "iss": ISSUER, "aud": AUDIENCE, "iat": now, "nbf": now, "exp": now + ttl, "jti": uuid.uuid4().hex}
    return jwt.encode(payload, jwt_secret(), algorithm=ALGORITHM)


def create_access_token(user: User) -> Tuple[str, int]:
    ttl = ACCESS_TOKEN_TTL
    # `id` is kept alongside `sub` for services that read the older claim name
    return _encode({"sub": str(user.id), "id": str(user.id), "type": "access", "tv": user.tokenVersion}, ttl), int(ttl.total_seconds())


def create_extension_token(user: User) -> Tuple[str, int]:
    ttl = EXTENSION_TOKEN_TTL
    return _encode({"sub": str(user.id), "id": str(user.id), "type": "extension", "scope": EXTENSION_SCOPE, "tv": user.tokenVersion}, ttl), int(ttl.total_seconds())


def create_state_token(claims: dict, ttl: timedelta = timedelta(minutes=10)) -> str:
    """Signed, short-lived token for OAuth state round-trips."""
    return _encode({**claims, "type": "oauth_state"}, ttl)


def decode_token(token: str, expected_types: set) -> Optional[dict]:
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[ALGORITHM], audience=AUDIENCE, issuer=ISSUER)
    except JWTError:
        return None
    if payload.get("type") not in expected_types:
        return None
    return payload


# ─── Refresh tokens ─────────────────────────────────────────────────────────

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _client_meta(request: Optional[Request]) -> dict:
    if request is None:
        return {"userAgent": "", "ip": ""}
    return {"userAgent": (request.headers.get("user-agent") or "")[:300], "ip": request.client.host if request.client else ""}


async def issue_refresh_token(user: User, request: Optional[Request], family: Optional[str] = None) -> str:
    raw = secrets.token_urlsafe(32)
    await RefreshToken(
        user=user.id, tokenHash=_hash_token(raw), family=family or uuid.uuid4().hex,
        expiresAt=datetime.utcnow() + REFRESH_TOKEN_TTL, **_client_meta(request),
    ).insert()
    return raw


# Two tabs refreshing at the same moment both present the same token; tolerate that briefly
ROTATION_GRACE = timedelta(seconds=30)


async def rotate_refresh_token(raw: str, request: Optional[Request]) -> Optional[Tuple[User, Optional[str]]]:
    """Validate a refresh token and replace it.

    Returns (user, new_raw_token), (user, None) for a concurrent refresh inside the grace window
    (the browser already holds the newer cookie), or None if the token is invalid."""
    record = await RefreshToken.find_one(RefreshToken.tokenHash == _hash_token(raw))
    now = datetime.utcnow()
    if record is None:
        return None
    if record.replacedAt and not record.revokedAt and now - record.replacedAt < ROTATION_GRACE:
        user = await User.get(record.user)
        return (user, None) if user and user.emailVerified else None
    if record.revokedAt or record.replacedAt:
        # A token that was already used is being replayed: assume theft, end the whole session family
        await RefreshToken.find(RefreshToken.family == record.family, RefreshToken.revokedAt == None).update(  # noqa: E711
            {"$set": {"revokedAt": now}})
        return None
    if record.expiresAt <= now:
        return None
    user = await User.get(record.user)
    if user is None or not user.emailVerified:
        return None
    record.replacedAt = now
    await record.save()
    return user, await issue_refresh_token(user, request, family=record.family)


async def revoke_refresh_token(raw: Optional[str]) -> None:
    if raw:
        await RefreshToken.find(RefreshToken.tokenHash == _hash_token(raw)).update({"$set": {"revokedAt": datetime.utcnow()}})


async def revoke_all_sessions(user: User) -> None:
    """Invalidate every refresh token and every outstanding JWT for the user."""
    user.tokenVersion += 1
    await user.save()
    await RefreshToken.find(RefreshToken.user == user.id, RefreshToken.revokedAt == None).update(  # noqa: E711
        {"$set": {"revokedAt": datetime.utcnow()}})


def set_refresh_cookie(response: Response, raw: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE, raw, max_age=int(REFRESH_TOKEN_TTL.total_seconds()), path=REFRESH_COOKIE_PATH,
        httponly=True, secure=cookie_secure(), samesite="strict",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH, httponly=True, secure=cookie_secure(), samesite="strict")


def public_user(user: User) -> dict:
    return {"_id": str(user.id), "name": user.name, "email": user.email, "emailVerified": user.emailVerified,
            "hasPassword": bool(user.password), "googleLinked": bool(user.googleId)}


async def start_session(user: User, request: Optional[Request], response: Response) -> dict:
    """Issue an access token (returned in the body) and a refresh token (httpOnly cookie)."""
    user.lastLoginAt = datetime.utcnow()
    user.failedLoginAttempts = 0
    user.lockedUntil = None
    await user.save()
    set_refresh_cookie(response, await issue_refresh_token(user, request))
    token, expires_in = create_access_token(user)
    return {"accessToken": token, "expiresIn": expires_in, "user": public_user(user)}


# ─── Email OTPs ─────────────────────────────────────────────────────────────

def _otp_hash(email: str, purpose: str, code: str) -> str:
    # Keyed with the server secret so a database leak doesn't expose codes to brute force offline
    return hmac.new(jwt_secret().encode(), f"{purpose}:{email}:{code}".encode(), hashlib.sha256).hexdigest()


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


async def create_otp(email: str, purpose: str, **pending) -> Tuple[Optional[str], int]:
    """Create or replace the OTP for (email, purpose).

    Returns (code, 0) on success, or (None, seconds_to_wait) when inside the resend cooldown."""
    now = datetime.utcnow()
    existing = await EmailOtp.find_one(EmailOtp.email == email, EmailOtp.purpose == purpose)
    if existing and now - existing.lastSentAt < OTP_RESEND_COOLDOWN:
        return None, int((OTP_RESEND_COOLDOWN - (now - existing.lastSentAt)).total_seconds()) + 1
    code = generate_otp()
    fields = dict(codeHash=_otp_hash(email, purpose, code), expiresAt=now + OTP_TTL, attempts=0, lastSentAt=now, **pending)
    if existing:
        for key, value in fields.items():
            setattr(existing, key, value)
        await existing.save()
    else:
        await EmailOtp(email=email, purpose=purpose, **fields).insert()
    return code, 0


async def verify_otp(email: str, purpose: str, code: str) -> Tuple[Optional[EmailOtp], str]:
    """Check a code. Returns (record, "") on success or (None, reason). Successful codes are consumed."""
    record = await EmailOtp.find_one(EmailOtp.email == email, EmailOtp.purpose == purpose)
    if record is None or record.expiresAt <= datetime.utcnow():
        return None, "expired"
    if record.attempts >= OTP_MAX_ATTEMPTS:
        return None, "too_many_attempts"
    if not hmac.compare_digest(record.codeHash, _otp_hash(email, purpose, code.strip())):
        record.attempts += 1
        await record.save()
        return None, "too_many_attempts" if record.attempts >= OTP_MAX_ATTEMPTS else "invalid"
    await record.delete()
    return record, ""


async def get_user_for_token(payload: dict) -> Optional[User]:
    try:
        user = await User.get(PydanticObjectId(payload.get("sub")))
    except Exception:
        return None
    if user is None or user.tokenVersion != payload.get("tv") or not user.emailVerified:
        return None
    return user
