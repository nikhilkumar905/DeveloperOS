"""Sign in with Google (OpenID Connect authorization-code flow with PKCE).

Setup (Google Cloud Console -> APIs & Services -> Credentials -> OAuth client ID, type "Web application"):
  Authorized redirect URI: http://localhost:6500/api/auth/google/callback  (GOOGLE_REDIRECT_URI)
  Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
"""
import base64
import hashlib
import hmac
import os
import secrets
import time
from typing import Optional
from urllib.parse import urlencode

import httpx
from jose import jwt, JWTError

AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs"
VALID_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}

FLOW_COOKIE = "devos_google_flow"
FLOW_COOKIE_PATH = "/api/auth/google"

_jwks_cache: dict = {"keys": None, "fetched": 0.0}
JWKS_TTL_SECONDS = 3600


class GoogleAuthError(Exception):
    pass


def client_id() -> str:
    return os.getenv("GOOGLE_CLIENT_ID", "")


def configured() -> bool:
    return bool(os.getenv("GOOGLE_CLIENT_ID") and os.getenv("GOOGLE_CLIENT_SECRET"))


def redirect_uri() -> str:
    return os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:6500/api/auth/google/callback")


def new_flow() -> dict:
    """Random state (CSRF), nonce (replay) and PKCE verifier for one sign-in attempt."""
    return {"state": secrets.token_urlsafe(24), "nonce": secrets.token_urlsafe(24), "cv": secrets.token_urlsafe(48)}


def authorization_url(flow: dict) -> str:
    challenge = base64.urlsafe_b64encode(hashlib.sha256(flow["cv"].encode()).digest()).rstrip(b"=").decode()
    return AUTH_ENDPOINT + "?" + urlencode({
        "client_id": client_id(),
        "redirect_uri": redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
        "state": flow["state"],
        "nonce": flow["nonce"],
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "prompt": "select_account",
    })


def states_match(expected: str, received: Optional[str]) -> bool:
    return bool(received) and hmac.compare_digest(expected, received)


async def _google_keys(force: bool = False) -> list:
    if force or not _jwks_cache["keys"] or time.time() - _jwks_cache["fetched"] > JWKS_TTL_SECONDS:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(JWKS_URI)
        resp.raise_for_status()
        _jwks_cache.update(keys=resp.json()["keys"], fetched=time.time())
    return _jwks_cache["keys"]


async def verify_id_token(id_token: str, nonce: str) -> dict:
    """Verify signature (Google JWKS), issuer, audience, expiry, nonce and email verification."""
    try:
        kid = jwt.get_unverified_header(id_token).get("kid")
    except JWTError as e:
        raise GoogleAuthError("malformed id_token") from e
    keys = await _google_keys()
    key = next((k for k in keys if k.get("kid") == kid), None)
    if key is None:  # Google rotated keys since our cache was filled
        key = next((k for k in await _google_keys(force=True) if k.get("kid") == kid), None)
    if key is None:
        raise GoogleAuthError("unknown signing key")
    try:
        claims = jwt.decode(id_token, key, algorithms=["RS256"], audience=client_id(), options={"verify_at_hash": False})
    except JWTError as e:
        raise GoogleAuthError(f"invalid id_token: {e}") from e
    if claims.get("iss") not in VALID_ISSUERS:
        raise GoogleAuthError("wrong issuer")
    if not hmac.compare_digest(str(claims.get("nonce", "")), nonce):
        raise GoogleAuthError("nonce mismatch")
    if not claims.get("email") or claims.get("email_verified") not in (True, "true"):
        raise GoogleAuthError("Google account email is not verified")
    return claims


async def exchange_code(code: str, flow: dict) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(TOKEN_ENDPOINT, data={
            "code": code,
            "client_id": client_id(),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
            "redirect_uri": redirect_uri(),
            "grant_type": "authorization_code",
            "code_verifier": flow["cv"],
        })
    if resp.status_code != 200:
        raise GoogleAuthError(f"token exchange failed ({resp.status_code})")
    id_token = resp.json().get("id_token")
    if not id_token:
        raise GoogleAuthError("no id_token in response")
    return await verify_id_token(id_token, flow["nonce"])
