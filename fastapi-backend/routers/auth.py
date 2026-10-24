import os
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field, field_validator

from middleware.auth import get_current_user, require_csrf_header
from middleware.rate_limit import limiter
from models.auth_tokens import EmailOtp
from models.user import User, BCRYPT_MAX_BYTES
from services import auth_service as auth
from services import email_service, google_oauth

router = APIRouter(prefix="/api/auth", tags=["auth"])

COMMON_PASSWORDS = {
    "password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop",
    "iloveyou", "11111111", "00000000", "abc12345", "letmein1", "welcome1", "admin123", "passw0rd",
}
CHECK_EMAIL_MESSAGE = "If this email can be used, we've sent a 6-digit verification code to it."
INVALID_LOGIN = "Invalid email or password"


def frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:6501").rstrip("/")


def validate_password(password: str, email: str = "") -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(password.encode("utf-8")) > BCRYPT_MAX_BYTES:
        raise ValueError("Password must be at most 72 bytes")
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise ValueError("Password must contain at least one letter and one number")
    if password.lower() in COMMON_PASSWORDS or (email and password.lower() == email.lower()):
        raise ValueError("This password is too easy to guess")
    return password


class EmailBody(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class RegisterRequest(EmailBody):
    name: str = Field(min_length=2, max_length=80)
    password: str = Field(max_length=200)

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v


class VerifyRequest(EmailBody):
    code: str = Field(pattern=r"^\s*\d{6}\s*$")


class LoginRequest(EmailBody):
    password: str = Field(min_length=1, max_length=200)


class ResetRequest(VerifyRequest):
    password: str = Field(max_length=200)


class ChangePasswordRequest(BaseModel):
    currentPassword: Optional[str] = Field(default=None, max_length=200)
    newPassword: str = Field(max_length=200)


def _password_error(password: str, email: str = "") -> None:
    try:
        validate_password(password, email)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


def _otp_error(reason: str) -> HTTPException:
    if reason == "too_many_attempts":
        return HTTPException(status_code=429, detail="Too many incorrect codes. Request a new code.")
    if reason == "expired":
        return HTTPException(status_code=400, detail="This code has expired or was already used. Request a new code.")
    return HTTPException(status_code=400, detail="Incorrect code. Please check the code and try again.")


async def _deliver(coro) -> None:
    try:
        await coro
    except email_service.EmailNotConfigured:
        raise HTTPException(status_code=503, detail="Email delivery is not configured on the server.")
    except Exception as e:
        print(f"[auth] email delivery failed: {e}")
        raise HTTPException(status_code=502, detail="We couldn't send the email. Please try again shortly.")


# ─── Registration with email OTP ────────────────────────────────────────────

@router.post("/register", status_code=202)
@limiter.limit("5/minute;30/hour")
async def register_user(request: Request, body: RegisterRequest):
    _password_error(body.password, body.email)
    existing = await User.find_one(User.email == body.email)
    if existing:
        # Same response as a new signup, so this endpoint can't reveal who has an account
        code, wait = await auth.create_otp(body.email, "register_notice")
        if code:
            await _deliver(email_service.send_account_exists_notice(body.email))
        return {"message": CHECK_EMAIL_MESSAGE, "email": body.email, "resendAfter": 60}

    code, wait = await auth.create_otp(body.email, "register", pendingName=body.name, pendingPasswordHash=User.hash_password(body.password))
    if code is None:
        raise HTTPException(status_code=429, detail=f"Please wait {wait} seconds before requesting another code.")
    await _deliver(email_service.send_verification_code(body.email, code))
    return {"message": CHECK_EMAIL_MESSAGE, "email": body.email, "resendAfter": 60}


@router.post("/register/resend", status_code=202)
@limiter.limit("3/minute;20/hour")
async def resend_verification(request: Request, body: EmailBody):
    pending = await EmailOtp.find_one(EmailOtp.email == body.email, EmailOtp.purpose == "register")
    if pending and pending.pendingPasswordHash:
        code, wait = await auth.create_otp(body.email, "register", pendingName=pending.pendingName,
                                           pendingPasswordHash=pending.pendingPasswordHash)
        if code is None:
            raise HTTPException(status_code=429, detail=f"Please wait {wait} seconds before requesting another code.")
        await _deliver(email_service.send_verification_code(body.email, code))
    return {"message": CHECK_EMAIL_MESSAGE, "resendAfter": 60}


@router.post("/register/verify")
@limiter.limit("10/minute")
async def verify_registration(request: Request, response: Response, body: VerifyRequest):
    record, reason = await auth.verify_otp(body.email, "register", body.code)
    if record is None:
        raise _otp_error(reason)
    if await User.find_one(User.email == body.email):
        # Registered meanwhile (e.g. via Google); the code proves ownership, so just ask them to log in
        raise HTTPException(status_code=409, detail="This email already has an account. Please log in.")
    user = User(name=record.pendingName or body.email.split("@")[0], email=body.email,
                password=record.pendingPasswordHash, emailVerified=True)
    await user.insert()
    return await auth.start_session(user, request, response)


# ─── Login / session ────────────────────────────────────────────────────────

# Failed attempts for emails with no account are tracked too, so lockouts look identical either way
_unknown_email_failures: dict = {}


def _unknown_locked(email: str) -> Optional[datetime]:
    count, until = _unknown_email_failures.get(email, (0, None))
    return until if until and until > datetime.utcnow() else None


def _record_unknown_failure(email: str) -> None:
    count, until = _unknown_email_failures.get(email, (0, None))
    count += 1
    _unknown_email_failures[email] = (count, datetime.utcnow() + auth.LOCKOUT_DURATION if count >= auth.MAX_FAILED_LOGINS else None)
    if len(_unknown_email_failures) > 10_000:  # bound memory
        _unknown_email_failures.clear()


def _locked_error(until: datetime) -> HTTPException:
    minutes = max(1, int((until - datetime.utcnow()).total_seconds() // 60) + 1)
    return HTTPException(status_code=429, detail=f"Too many failed attempts. Try again in {minutes} minute(s) or reset your password.")


@router.post("/login")
@limiter.limit("10/minute;100/hour")
async def login_user(request: Request, response: Response, body: LoginRequest):
    user = await User.find_one(User.email == body.email)
    now = datetime.utcnow()
    if user is None:
        if until := _unknown_locked(body.email):
            raise _locked_error(until)
        User.burn_password_check(body.password)
        _record_unknown_failure(body.email)
        raise HTTPException(status_code=401, detail=INVALID_LOGIN)

    if user.lockedUntil and user.lockedUntil > now:
        raise _locked_error(user.lockedUntil)

    if not user.verify_password(body.password):
        user.failedLoginAttempts += 1
        if user.failedLoginAttempts >= auth.MAX_FAILED_LOGINS:
            user.lockedUntil = now + auth.LOCKOUT_DURATION
            user.failedLoginAttempts = 0
        await user.save()
        raise HTTPException(status_code=401, detail=INVALID_LOGIN)

    if not user.emailVerified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in.")
    return await auth.start_session(user, request, response)


@router.post("/refresh", dependencies=[Depends(require_csrf_header)])
@limiter.limit("30/minute")
async def refresh_session(request: Request, response: Response):
    raw = request.cookies.get(auth.REFRESH_COOKIE)
    rotated = await auth.rotate_refresh_token(raw, request) if raw else None
    if rotated is None:
        auth.clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    user, new_raw = rotated
    if new_raw:
        auth.set_refresh_cookie(response, new_raw)
    token, expires_in = auth.create_access_token(user)
    return {"accessToken": token, "expiresIn": expires_in, "user": auth.public_user(user)}


@router.post("/logout", dependencies=[Depends(require_csrf_header)])
async def logout(request: Request, response: Response):
    await auth.revoke_refresh_token(request.cookies.get(auth.REFRESH_COOKIE))
    auth.clear_refresh_cookie(response)
    return {"message": "Logged out"}


@router.post("/logout-all", dependencies=[Depends(require_csrf_header)])
async def logout_everywhere(response: Response, current_user: User = Depends(get_current_user)):
    await auth.revoke_all_sessions(current_user)
    auth.clear_refresh_cookie(response)
    return {"message": "Logged out of all devices"}


@router.get("/profile")
async def get_user_profile(current_user: User = Depends(get_current_user)):
    return auth.public_user(current_user)


@router.post("/extension-token")
@limiter.limit("10/hour")
async def extension_token(request: Request, current_user: User = Depends(get_current_user)):
    """A token for the browser extension that can only log/read activity, never touch the account."""
    token, expires_in = auth.create_extension_token(current_user)
    return {"token": token, "expiresIn": expires_in, "scope": auth.EXTENSION_SCOPE}


# ─── Password reset / change ────────────────────────────────────────────────

@router.post("/password/forgot", status_code=202)
@limiter.limit("3/minute;20/hour")
async def forgot_password(request: Request, body: EmailBody):
    user = await User.find_one(User.email == body.email)
    if user:
        code, _ = await auth.create_otp(body.email, "reset")
        if code:
            await _deliver(email_service.send_password_reset_code(body.email, code))
    return {"message": "If an account exists for this email, we've sent a password reset code.", "resendAfter": 60}


@router.post("/password/reset")
@limiter.limit("10/minute")
async def reset_password(request: Request, body: ResetRequest):
    _password_error(body.password, body.email)
    record, reason = await auth.verify_otp(body.email, "reset", body.code)
    if record is None:
        raise _otp_error(reason)
    user = await User.find_one(User.email == body.email)
    if user is None:
        raise _otp_error("expired")
    user.password = User.hash_password(body.password)
    user.emailVerified = True
    user.failedLoginAttempts = 0
    user.lockedUntil = None
    await auth.revoke_all_sessions(user)  # also saves the user
    return {"message": "Password updated. Please log in with your new password."}


@router.post("/password/change", dependencies=[Depends(require_csrf_header)])
@limiter.limit("5/minute")
async def change_password(request: Request, response: Response, body: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
    if current_user.password and not current_user.verify_password(body.currentPassword or ""):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    _password_error(body.newPassword, current_user.email)
    current_user.password = User.hash_password(body.newPassword)
    await auth.revoke_all_sessions(current_user)  # sign out everywhere else
    return await auth.start_session(current_user, request, response)


# ─── Google sign-in ─────────────────────────────────────────────────────────

@router.get("/config")
async def auth_config():
    return {"google": google_oauth.configured(), "emailDelivery": email_service.delivery_mode()}


@router.get("/google/login")
@limiter.limit("20/minute")
async def google_login(request: Request):
    if not google_oauth.configured():
        return RedirectResponse(f"{frontend_url()}/login?error=google_not_configured", status_code=302)
    flow = google_oauth.new_flow()
    response = RedirectResponse(google_oauth.authorization_url(flow), status_code=302)
    # Lax (not Strict) so the cookie comes back on Google's top-level redirect to our callback
    response.set_cookie(google_oauth.FLOW_COOKIE, auth.create_state_token({"flow": flow}), max_age=600,
                        path=google_oauth.FLOW_COOKIE_PATH, httponly=True, secure=auth.cookie_secure(), samesite="lax")
    return response


@router.get("/google/callback")
@limiter.limit("20/minute")
async def google_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    def fail(reason: str) -> RedirectResponse:
        resp = RedirectResponse(f"{frontend_url()}/login?error={reason}", status_code=302)
        resp.delete_cookie(google_oauth.FLOW_COOKIE, path=google_oauth.FLOW_COOKIE_PATH)
        return resp

    if error:
        return fail("google_cancelled")
    flow_cookie = request.cookies.get(google_oauth.FLOW_COOKIE)
    payload = auth.decode_token(flow_cookie, {"oauth_state"}) if flow_cookie else None
    flow = (payload or {}).get("flow")
    if not flow or not code or not google_oauth.states_match(flow.get("state", ""), state):
        return fail("google_state")

    try:
        claims = await google_oauth.exchange_code(code, flow)
    except Exception as e:
        print(f"[auth] google sign-in failed: {e}")
        return fail("google_failed")

    email = claims["email"].strip().lower()
    user = await User.find_one(User.googleId == claims["sub"]) or await User.find_one(User.email == email)
    if user is None:
        user = User(name=(claims.get("name") or email.split("@")[0])[:80], email=email, password=None,
                    emailVerified=True, googleId=claims["sub"])
        await user.insert()
    else:
        # Google has verified this address, so link it to the existing account
        if user.googleId and user.googleId != claims["sub"]:
            return fail("google_conflict")
        user.googleId = claims["sub"]
        user.emailVerified = True
    await EmailOtp.find(EmailOtp.email == email, EmailOtp.purpose == "register").delete()

    response = RedirectResponse(f"{frontend_url()}/auth/callback", status_code=302)
    response.delete_cookie(google_oauth.FLOW_COOKIE, path=google_oauth.FLOW_COOKIE_PATH)
    await auth.start_session(user, request, response)  # sets the refresh cookie; the SPA then calls /refresh
    return response
