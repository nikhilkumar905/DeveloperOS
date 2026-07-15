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
)

# ─── CORS ───────────────────────────────────────────────────────────────────
# Use allow_origin_regex to cover all localhost ports, chrome/browser extensions.
# This handles preflight OPTIONS requests properly with credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=(
        r"http://localhost:\d+"          # all localhost ports
        r"|https://localhost:\d+"        # https localhost
        r"|chrome-extension://.*"        # Chrome extension
        r"|moz-extension://.*"           # Firefox extension
        r"|safari-web-extension://.*"    # Safari extension
    ),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
from routers.auth import router as auth_router
from routers.dashboard import router as dashboard_router
from routers.github import router as github_router
from routers.leetcode import router as leetcode_router
from routers.analytics import router as analytics_router
from routers.graph import router as graph_router
from routers.resume import router as resume_router
from routers.portfolio import router as portfolio_router
from routers.activity import router as activity_router

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(github_router)
app.include_router(leetcode_router)
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


# ─── Global Error Handler ────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[server] Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"message": "An unexpected server error occurred"})


if __name__ == "__main__":
    import uvicorn
    PORT = int(os.getenv("PORT", "6500"))
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
