from typing import Optional, Dict
from beanie import Document, PydanticObjectId
from pydantic import BaseModel


class SectionVisibility(BaseModel):
    showSkills: bool = True
    showProjects: bool = True
    showExperience: bool = True
    showContact: bool = True


class PortfolioSettings(Document):
    user: PydanticObjectId
    theme: str = "modern-dark"
    primaryColor: str = "#6366f1"
    fontFamily: str = "Inter"
    heroSubtitle: str = "Building scalable software systems & intelligent applications"
    bio: str = ""
    profilePictureUrl: str = ""
    sectionVisibility: SectionVisibility = SectionVisibility()

    class Settings:
        name = "portfoliosettings"
