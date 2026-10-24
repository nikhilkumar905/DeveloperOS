from fastapi import Request
from jose import jwt, JWTError
from slowapi import Limiter
from slowapi.util import get_remote_address

from services.auth_service import ALGORITHM, AUDIENCE, ISSUER, jwt_secret


def rate_key(request: Request) -> str:
    """Limit authenticated calls per account (so one user can't spend the shared Groq quota), and
    anonymous calls per client IP. The token is only used to choose the bucket here; the endpoint
    still performs full authentication."""
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        try:
            claims = jwt.decode(header[7:], jwt_secret(), algorithms=[ALGORITHM], audience=AUDIENCE, issuer=ISSUER)
            if claims.get("sub"):
                return f"user:{claims['sub']}"
        except (JWTError, RuntimeError):
            pass
    return f"ip:{get_remote_address(request)}"


# In-memory counters: fine for one worker. Use storage_uri=redis://... if you run several.
limiter = Limiter(key_func=rate_key, headers_enabled=False)

# Limits for endpoints that call the LLM (values are per account)
LLM_LIMITS = {
    "insights_refresh": "5/hour;20/day",
    "resume_infer": "10/hour;40/day",
}
