from typing import Optional, List, Dict, Any
from beanie import Document, PydanticObjectId
from pydantic import BaseModel
from datetime import datetime


class GithubProfile(BaseModel):
    username: str = ""
    avatarUrl: str = ""
    bio: str = ""
    followers: int = 0
    following: int = 0
    publicRepos: int = 0


class GithubRepository(BaseModel):
    name: str = ""
    url: str = ""
    homepage: str = ""
    stars: int = 0
    forks: int = 0
    language: str = "Unknown"
    languages: List[str] = []
    dependencies: List[str] = []
    filePaths: List[str] = []
    defaultBranch: str = "main"
    description: str = ""


class AggregatedStats(BaseModel):
    totalCommits: int = 0
    totalPRs: int = 0
    totalIssues: int = 0
    totalStars: int = 0


class GithubStats(Document):
    user: PydanticObjectId
    profile: GithubProfile = GithubProfile()
    repositories: List[GithubRepository] = []
    aggregatedStats: AggregatedStats = AggregatedStats()
    topLanguages: Dict[str, int] = {}
    lastSyncedAt: Optional[datetime] = None

    class Settings:
        name = "githubstats"
