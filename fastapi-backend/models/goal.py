from typing import Optional
from beanie import Document, PydanticObjectId
from datetime import datetime


class Goal(Document):
    user: PydanticObjectId
    title: str
    targetValue: float
    currentValue: float = 0.0
    unit: str
    deadline: str
    completed: bool = False
    createdAt: datetime = datetime.utcnow()

    class Settings:
        name = "goals"
