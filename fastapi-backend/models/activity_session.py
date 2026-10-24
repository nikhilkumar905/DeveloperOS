from typing import Optional, List, Dict
from beanie import Document, PydanticObjectId
from pydantic import Field
from datetime import datetime


class ActivitySession(Document):
    user: PydanticObjectId
    date: str  # YYYY-MM-DD
    totalTimeMs: float = 0
    platformBreakdown: Dict[str, float] = {}
    problemsSolved: int = 0
    problemsAttempted: int = 0
    reposVisited: int = 0
    articlesRead: int = 0
    streak: int = 0
    productivityScore: int = 0
    longestSession: float = 0
    activePlatforms: List[str] = []
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "activitysessions"
