from typing import Optional, Dict, Any
from beanie import Document, PydanticObjectId
from datetime import datetime


class GeneratedDocument(Document):
    user: PydanticObjectId
    documentType: str  # 'RESUME_PDF' | 'PORTFOLIO_BUNDLE'
    title: str = ""
    templateOrTheme: str = ""
    atsScore: int = 0
    metadata: Optional[Dict[str, Any]] = None
    createdAt: datetime = datetime.utcnow()

    class Settings:
        name = "generateddocuments"
