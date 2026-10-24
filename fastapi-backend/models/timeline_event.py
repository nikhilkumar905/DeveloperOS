from beanie import Document, PydanticObjectId
from pydantic import Field
from datetime import datetime


class TimelineEvent(Document):
    user: PydanticObjectId
    title: str
    description: str = ""
    type: str = "milestone"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "timelineevents"
