from typing import Optional, List, Dict, Any
from beanie import Document, PydanticObjectId
from pydantic import BaseModel
from datetime import datetime


class LeetcodeStats(BaseModel):
    solvedTotal: int = 0
    solvedEasy: int = 0
    solvedMedium: int = 0
    solvedHard: int = 0
    contestRating: int = 0
    badges: int = 0
    streak: int = 0
    submissions: int = 0
    recentActivity: List[Dict[str, Any]] = []
    lastSyncedAt: Optional[datetime] = None


class IntegrationProfile(Document):
    user: PydanticObjectId
    githubUsername: str = ""
    githubToken: Optional[str] = None
    leetcodeUsername: str = ""
    leetcodeStats: LeetcodeStats = LeetcodeStats()
    activitySettings: Optional[Dict[str, bool]] = None

    class Settings:
        name = "integrationprofiles"
