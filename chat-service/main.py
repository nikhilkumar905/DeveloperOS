import os
import asyncio
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

from database import get_user_data, get_auth_user
from indexer import prepare_documents
from rag_engine import ingest_documents, is_indexed, retrieve, answer, normalize_history
from rate_limit import chat_limiter, index_limiter

JWT_SECRET = os.getenv("JWT_SECRET", "")
if not JWT_SECRET:
    raise RuntimeError("[chat-service] FATAL: JWT_SECRET must be set (same value as the main backend)")

app = FastAPI(title="DeveloperOS Chat Service")

def allowed_origins() -> list:
    """Same allow-list rules as the main backend: local dev origins + FRONTEND_URL + CORS_ORIGINS."""
    origins = {"http://localhost:6501", "http://localhost:5173", "http://127.0.0.1:6501", "http://127.0.0.1:5173"}
    origins |= {o.strip().rstrip("/") for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()}
    if os.getenv("FRONTEND_URL"):
        origins.add(os.getenv("FRONTEND_URL").rstrip("/"))
    return sorted(origins)


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    # Bearer tokens only — no cookies, so credentials aren't needed
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)

security = HTTPBearer(auto_error=False)
UNAUTHORIZED = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authorized, token invalid or expired")


async def get_user_id(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    """Identify the user from the main backend's access token — never from the request body.

    Mirrors fastapi-backend's checks: signature, expiry, issuer/audience, token type, and the user's
    tokenVersion (so "log out everywhere" and password resets revoke chat access immediately)."""
    if credentials is None:
        raise UNAUTHORIZED
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"], audience="developeros-api", issuer="developeros")
    except JWTError:
        raise UNAUTHORIZED
    if payload.get("type") != "access" or not payload.get("sub"):
        raise UNAUTHORIZED
    user = await get_auth_user(payload["sub"])
    if not user or user.get("tokenVersion", 0) != payload.get("tv") or user.get("emailVerified", True) is False:
        raise UNAUTHORIZED
    return payload["sub"]


# One index build at a time per user, so a double-click can't interleave delete/add
_index_locks: dict[str, asyncio.Lock] = {}


async def index_user(user_id: str) -> int:
    lock = _index_locks.setdefault(user_id, asyncio.Lock())
    async with lock:
        data = await get_user_data(user_id)
        if not data.get("user"):
            raise HTTPException(status_code=404, detail="User not found")
        docs = prepare_documents(data)
        # Embedding is CPU-bound; keep it off the event loop
        return await asyncio.to_thread(ingest_documents, user_id, docs)


class HistoryItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: Optional[List[HistoryItem]] = None


@app.get("/api/health")
async def health():
    return {"status": "OK", "service": "chat"}


@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest, user_id: str = Depends(get_user_id)):
    chat_limiter.check(user_id)
    question = req.message.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Message is required")

    try:
        if not await asyncio.to_thread(is_indexed, user_id):
            await index_user(user_id)

        history = normalize_history([h.model_dump() for h in req.history or []])
        docs = await asyncio.to_thread(retrieve, user_id, question, history)
        response = await answer(question, history, docs)
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        print(f"[chat-service] chat error: {message}")
        if "rate_limit" in message or "429" in message:
            raise HTTPException(status_code=429, detail="The AI is getting too many requests right now. Please try again in a minute.")
        if "GROQ_API_KEY" in message or "api_key" in message.lower():
            raise HTTPException(status_code=500, detail="Chat service is missing GROQ_API_KEY")
        raise HTTPException(status_code=500, detail="Failed to generate a response")

    sources = sorted({d.metadata.get("source", "") for d in docs} - {""})
    return {"response": response, "sources": sources}


@app.post("/api/index")
async def index_endpoint(user_id: str = Depends(get_user_id)):
    index_limiter.check(user_id)
    try:
        count = await index_user(user_id)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[chat-service] index error: {e}")
        raise HTTPException(status_code=500, detail="Failed to build the knowledge base")
    return {"status": "success", "indexed_documents": count}


if __name__ == "__main__":
    import uvicorn
    # 8000 is a common default that often clashes with other local services
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("CHAT_PORT", "6502")))
