"""Per-user sliding-window rate limits for the endpoints that spend LLM / embedding budget.

Limits are per authenticated user (not per IP), so one account can't burn the shared Groq quota
for everyone. State is in memory: it resets when the service restarts and isn't shared between
processes. Use one worker, or move the counters to Redis if you scale out.
"""
import os
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException


class UserRateLimiter:
    def __init__(self, name: str, windows: list[tuple[int, int]]):
        # windows: [(max_requests, window_seconds), ...]; every window must hold
        self.name = name
        self.windows = windows
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, user_id: str) -> None:
        now = time.monotonic()
        longest = max(seconds for _, seconds in self.windows)
        with self._lock:
            hits = self._hits[user_id]
            while hits and now - hits[0] > longest:
                hits.popleft()
            for limit, seconds in self.windows:
                recent = sum(1 for t in hits if now - t <= seconds)
                if recent >= limit:
                    retry_after = int(seconds - (now - next(t for t in hits if now - t <= seconds))) + 1
                    raise HTTPException(
                        status_code=429,
                        detail=f"Too many {self.name} requests. Please wait {retry_after} seconds and try again.",
                        headers={"Retry-After": str(retry_after)},
                    )
            hits.append(now)


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


# Chat: a conversational pace per minute, and a daily ceiling that protects the Groq free-tier quota.
chat_limiter = UserRateLimiter(
    "chat",
    [
        (_env_int("CHAT_PER_MINUTE", 10), 60),
        (_env_int("CHAT_PER_DAY", 200), 24 * 60 * 60),
    ],
)

# Re-indexing rebuilds embeddings; it's cheap but shouldn't be spammed.
index_limiter = UserRateLimiter("re-index", [(_env_int("INDEX_PER_HOUR", 6), 60 * 60)])
