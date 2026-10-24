from beanie import Document, PydanticObjectId
from pydantic import Field
from datetime import datetime


class Notification(Document):
    user: PydanticObjectId
    message: str
    type: str = "info"
    read: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "notifications"

