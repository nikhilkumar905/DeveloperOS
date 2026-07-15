from typing import Optional, List, Dict
from beanie import Document, PydanticObjectId
from pydantic import BaseModel
from datetime import datetime


class DevScores(BaseModel):
    dsa: int = 0
    frontend: int = 0
    backend: int = 0
    fullStack: int = 0
    consistency: int = 0
    productivity: int = 0
    interviewReadiness: int = 0
    overallScore: int = 0
    database: Optional[int] = None
    devops: Optional[int] = None
    aiMl: Optional[int] = None
    security: Optional[int] = None
    cloud: Optional[int] = None


class DeveloperIntelligence(Document):
    user: PydanticObjectId
    scores: DevScores = DevScores()
    strengths: List[str] = []
    weaknesses: List[str] = []
    recommendations: List[str] = []
    roadmap: List[str] = []
    lastCalculatedAt: Optional[datetime] = None

    class Settings:
        name = "developerintelligences"
