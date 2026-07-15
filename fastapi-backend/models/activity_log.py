from typing import Optional, List, Dict, Any
from beanie import Document, PydanticObjectId
from pydantic import BaseModel
from datetime import datetime


class ActivityMetadata(BaseModel):
    url: str = ""
    title: str = ""
    repoName: str = ""
    repoOwner: str = ""
    problemName: str = ""
    problemSlug: str = ""
    difficulty: Optional[str] = None
    language: str = ""
    tags: List[str] = []
    contestName: str = ""
    score: float = 0


class ActivityLog(Document):
    user: PydanticObjectId
    platform: str
    activityType: str
    metadata: ActivityMetadata = ActivityMetadata()
    duration: float = 0
    timestamp: datetime = datetime.utcnow()
    synced: bool = True

    class Settings:
        name = "activitylogs"
