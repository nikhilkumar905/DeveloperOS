from typing import Optional, List, Dict, Any
from beanie import Document, PydanticObjectId
from pydantic import BaseModel
from datetime import datetime


class PersonalInfo(BaseModel):
    fullName: str = ""
    jobTitle: str = "Software Engineer"
    email: str = ""
    phone: str = ""
    location: str = ""
    githubUrl: str = ""
    linkedinUrl: str = ""
    websiteUrl: str = ""
    customLinks: List[Dict[str, str]] = []


class EducationItem(BaseModel):
    institution: str = ""
    location: str = ""
    degree: str = ""
    fieldOfStudy: str = ""
    startYear: str = ""
    endYear: str = ""
    gpa: str = ""
    highlights: List[str] = []


class ExperienceItem(BaseModel):
    role: str = ""
    company: str = ""
    location: str = ""
    startDate: str = ""
    endDate: str = ""
    current: bool = False
    bullets: List[str] = []
    techStack: List[str] = []


class ResumeProject(BaseModel):
    name: str = ""
    description: str = ""
    liveUrl: str = ""
    githubUrl: str = ""
    technologies: List[str] = []
    bullets: List[str] = []


class CertificationItem(BaseModel):
    name: str = ""
    issuer: str = ""
    issueDate: str = ""
    credentialUrl: str = ""


class HackathonItem(BaseModel):
    name: str = ""
    achievement: str = ""
    date: str = ""


class CategorizedSkill(BaseModel):
    category: str = ""
    skills: List[str] = []


class CustomSectionItem(BaseModel):
    title: str = ""
    subtitle: str = ""
    date: str = ""
    bullets: List[str] = []


class CustomSection(BaseModel):
    title: str = ""
    items: List[CustomSectionItem] = []


class ResumeSkills(BaseModel):
    technical: List[str] = []
    frameworks: List[str] = []
    tools: List[str] = []
    soft: List[str] = []


class ResumeProfile(Document):
    user: PydanticObjectId
    personalInfo: PersonalInfo = PersonalInfo()
    careerObjective: str = ""
    targetRole: str = "Software Engineer"
    selectedTemplate: str = "Software Engineer"
    education: List[EducationItem] = []
    experience: List[ExperienceItem] = []
    projects: List[ResumeProject] = []
    skills: ResumeSkills = ResumeSkills()
    certifications: List[CertificationItem] = []
    hackathons: List[HackathonItem] = []
    categorizedSkills: List[CategorizedSkill] = []
    customSections: List[CustomSection] = []
    achievements: List[str] = []
    atsScore: int = 0
    atsSuggestions: List[str] = []
    lastInferredAt: Optional[datetime] = None

    class Settings:
        name = "resumeprofiles"
