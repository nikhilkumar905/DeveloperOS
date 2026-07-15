from beanie import Document, PydanticObjectId
from datetime import datetime


class Notification(Document):
    user: PydanticObjectId
    message: str
    type: str = "info"
    read: bool = False
    createdAt: datetime = datetime.utcnow()

    class Settings:
        name = "notifications"


class TimelineEvent(Document):
    user: PydanticObjectId
    title: str
    description: str = ""
    type: str = "milestone"
    timestamp: datetime = datetime.utcnow()

    class Settings:
        name = "timelineevents"
