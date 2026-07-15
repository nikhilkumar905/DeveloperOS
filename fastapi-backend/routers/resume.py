import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from models.user import User
from models.resume_profile import ResumeProfile, PersonalInfo, ResumeSkills, EducationItem, ExperienceItem, ResumeProject, CertificationItem, HackathonItem, CategorizedSkill
from models.github_stats import GithubStats
from models.integration_profile import IntegrationProfile
from models.developer_intelligence import DeveloperIntelligence
from models.knowledge_graph import KnowledgeGraph
from models.generated_document import GeneratedDocument
from services.resume_intelligence_engine import infer_resume_data, analyze_ats_compatibility
from services.pdf_export_service import generate_resume_pdf_buffer
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/resume", tags=["resume"])


@router.get("/profile")
async def get_resume_profile(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    profile = await ResumeProfile.find_one(ResumeProfile.user == uid)

    if not profile:
        github_stats = await GithubStats.find_one(GithubStats.user == uid)
        integration = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
        intelligence = await DeveloperIntelligence.find_one(DeveloperIntelligence.user == uid)
        graph = await KnowledgeGraph.find_one(KnowledgeGraph.user == uid)

        inferred = await infer_resume_data(current_user, github_stats, integration, intelligence, graph, "Software Engineer")
        ats_result = analyze_ats_compatibility(type("P", (), inferred)(), "Software Engineer")

        profile = ResumeProfile(user=uid, **_map_inferred(inferred), atsScore=ats_result["score"], atsSuggestions=ats_result["suggestions"], lastInferredAt=datetime.utcnow())
        await profile.insert()

    return profile.model_dump(by_alias=True)


@router.put("/profile")
async def update_resume_profile(body: dict, current_user: User = Depends(get_current_user)):
    uid = current_user.id
    profile = await ResumeProfile.find_one(ResumeProfile.user == uid)
    if not profile:
        raise HTTPException(status_code=404, detail="Resume profile not found")

    for key, value in body.items():
        if hasattr(profile, key):
            setattr(profile, key, value)

    ats_result = analyze_ats_compatibility(profile, profile.targetRole)
    profile.atsScore = ats_result["score"]
    profile.atsSuggestions = ats_result["suggestions"]
    await profile.save()
    return profile.model_dump(by_alias=True)


class InferRequest(BaseModel):
    targetRole: Optional[str] = "Software Engineer"


@router.post("/infer")
async def infer_resume(body: InferRequest, current_user: User = Depends(get_current_user)):
    uid = current_user.id
    github_stats = await GithubStats.find_one(GithubStats.user == uid)
    integration = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    intelligence = await DeveloperIntelligence.find_one(DeveloperIntelligence.user == uid)
    graph = await KnowledgeGraph.find_one(KnowledgeGraph.user == uid)

    inferred = await infer_resume_data(current_user, github_stats, integration, intelligence, graph, body.targetRole)
    ats_result = analyze_ats_compatibility(type("P", (), inferred)(), body.targetRole)

    profile = await ResumeProfile.find_one(ResumeProfile.user == uid)
    if not profile:
        profile = ResumeProfile(user=uid)

    for key, value in _map_inferred(inferred).items():
        if hasattr(profile, key):
            setattr(profile, key, value)

    profile.atsScore = ats_result["score"]
    profile.atsSuggestions = ats_result["suggestions"]
    profile.lastInferredAt = datetime.utcnow()
    await profile.save()
    return {"profile": profile.model_dump(by_alias=True), "atsResult": ats_result}


@router.post("/analyze-ats")
async def analyze_ats(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    profile = await ResumeProfile.find_one(ResumeProfile.user == uid)
    if not profile:
        raise HTTPException(status_code=404, detail="Resume profile not found")
    ats_result = analyze_ats_compatibility(profile, profile.targetRole)
    profile.atsScore = ats_result["score"]
    profile.atsSuggestions = ats_result["suggestions"]
    await profile.save()
    return ats_result


@router.get("/export/pdf")
async def export_resume_pdf(filename: Optional[str] = None, current_user: User = Depends(get_current_user)):
    uid = current_user.id
    profile = await ResumeProfile.find_one(ResumeProfile.user == uid)
    if not profile:
        raise HTTPException(status_code=404, detail="Resume profile not found")

    pdf_bytes = generate_resume_pdf_buffer(profile)

    await GeneratedDocument(
        user=uid,
        documentType="RESUME_PDF",
        title=f"{profile.personalInfo.fullName or 'Developer'}_Resume",
        templateOrTheme=profile.selectedTemplate or "Software Engineer",
        atsScore=profile.atsScore or 85,
        metadata={"targetRole": profile.targetRole},
    ).insert()

    raw_name = filename.strip() if filename else f"{profile.personalInfo.fullName or 'Developer'}_Resume"
    clean_name = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", raw_name)
    final_filename = clean_name if clean_name.lower().endswith(".pdf") else f"{clean_name}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{final_filename}"'},
    )


def _map_inferred(inferred: dict) -> dict:
    """Map raw dict from infer_resume_data to model fields."""
    result = dict(inferred)
    if "personalInfo" in result:
        result["personalInfo"] = PersonalInfo(**result["personalInfo"])
    if "skills" in result:
        result["skills"] = ResumeSkills(**result["skills"])
    if "education" in result:
        result["education"] = [EducationItem(**e) for e in result["education"]]
    if "experience" in result:
        result["experience"] = [ExperienceItem(**e) for e in result["experience"]]
    if "projects" in result:
        result["projects"] = [ResumeProject(**p) for p in result["projects"]]
    if "certifications" in result:
        result["certifications"] = [CertificationItem(**c) for c in result["certifications"]]
    if "hackathons" in result:
        result["hackathons"] = [HackathonItem(**h) for h in result["hackathons"]]
    if "categorizedSkills" in result:
        result["categorizedSkills"] = [CategorizedSkill(**s) for s in result["categorizedSkills"]]
    return result
