from typing import Optional, Dict, Any
from beanie import Document, PydanticObjectId
from pydantic import Field
from datetime import datetime


class GeneratedDocument(Document):
    user: PydanticObjectId
    documentType: str  # 'RESUME_PDF' | 'PORTFOLIO_BUNDLE'
    title: str = ""
    templateOrTheme: str = ""
    atsScore: int = 0
    metadata: Optional[Dict[str, Any]] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "generateddocuments"
