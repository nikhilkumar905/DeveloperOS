import os
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from config.database import init_db

load_dotenv()

# ─── Startup Validation ─────────────────────────────────────────────────────
REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"]
missing = [key for key in REQUIRED_ENV if not os.getenv(key)]
if missing:
    raise RuntimeError(f"[server] FATAL: Missing required environment variables: {', '.join(missing)}")

from services.auth_service import is_production  # noqa: E402

if len(os.getenv("JWT_SECRET", "")) < 32:
    message = "JWT_SECRET should be at least 32 random characters (e.g. `python -c \"import secrets; print(secrets.token_urlsafe(48))\"`)"
    if is_production():
        raise RuntimeError(f"[server] FATAL: {message}")
    print(f"[server] WARNING: {message}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print(f"[server] DeveloperOS FastAPI backend running on port {os.getenv('PORT', '6500')}")
    yield


app = FastAPI(
    title="DeveloperOS API",
    description="Backend API for DeveloperOS - Developer productivity platform",
    version="2.0.0",
    lifespan=lifespan,
    # Interactive API docs expose every endpoint; keep them out of production
    docs_url=None if is_production() else "/docs",
    redoc_url=None,
    openapi_url=None if is_production() else "/openapi.json",
)

# ─── Rate limiting ──────────────────────────────────────────────────────────
from slowapi.errors import RateLimitExceeded  # noqa: E402
from middleware.rate_limit import limiter  # noqa: E402

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Too many requests. Please slow down and try again shortly."})


# ─── Security headers ───────────────────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    # JSON API: nothing may be rendered or framed from these responses (exported HTML/PDF are downloads)
    if not request.url.path.startswith(("/docs", "/openapi.json")):
        response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; sandbox")
    if request.url.path.startswith("/api/auth"):
        response.headers["Cache-Control"] = "no-store"
    if request.url.scheme == "https":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response

# ─── CORS ───────────────────────────────────────────────────────────────────
# Explicit origin allow-list (never "*" with credentials) plus browser-extension origins.
from middleware.auth import allowed_origins  # noqa: E402

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins()),
    allow_origin_regex=r"^(chrome|moz|safari-web)-extension://[a-z0-9]+$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["Content-Disposition"],
    max_age=600,
)

# ─── Routers ─────────────────────────────────────────────────────────────────
from routers.auth import router as auth_router
from routers.dashboard import router as dashboard_router
from routers.github import router as github_router
from routers.leetcode import router as leetcode_router
from routers.gfg import router as gfg_router
from routers.analytics import router as analytics_router
from routers.graph import router as graph_router
from routers.resume import router as resume_router
from routers.portfolio import router as portfolio_router
from routers.activity import router as activity_router

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(github_router)
app.include_router(leetcode_router)
app.include_router(gfg_router)
app.include_router(analytics_router)
app.include_router(graph_router)
app.include_router(resume_router)
app.include_router(portfolio_router)
app.include_router(activity_router)


# ─── Health Check ────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {
        "status": "OK",
        "message": "DeveloperOS FastAPI backend is running",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
    }


from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, StarletteHTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    print(f"[server] Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"message": "An unexpected server error occurred"})


if __name__ == "__main__":
    import uvicorn
    PORT = int(os.getenv("PORT", "6500"))
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
