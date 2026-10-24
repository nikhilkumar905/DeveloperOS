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


class GfgStats(BaseModel):
    solvedTotal: int = 0
    solvedSchool: int = 0
    solvedBasic: int = 0
    solvedEasy: int = 0
    solvedMedium: int = 0
    solvedHard: int = 0
    codingScore: int = 0
    monthlyScore: int = 0
    currentStreak: int = 0
    longestStreak: int = 0
    instituteName: str = ""
    instituteRank: str = ""
    articlesPublished: int = 0
    languages: Dict[str, int] = {}
    recentActivity: List[Dict[str, Any]] = []
    lastSyncedAt: Optional[datetime] = None


class IntegrationProfile(Document):
    user: PydanticObjectId
    githubUsername: str = ""
    githubToken: Optional[str] = None
    leetcodeUsername: str = ""
    leetcodeStats: LeetcodeStats = LeetcodeStats()
    gfgUsername: str = ""
    gfgStats: GfgStats = GfgStats()
    activitySettings: Optional[Dict[str, bool]] = None

    class Settings:
        name = "integrationprofiles"
