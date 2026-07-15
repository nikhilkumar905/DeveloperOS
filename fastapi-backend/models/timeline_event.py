from beanie import Document, PydanticObjectId
from datetime import datetime


class TimelineEvent(Document):
    user: PydanticObjectId
    title: str
    description: str = ""
    type: str = "milestone"
    timestamp: datetime = datetime.utcnow()

    class Settings:
        name = "timelineevents"
