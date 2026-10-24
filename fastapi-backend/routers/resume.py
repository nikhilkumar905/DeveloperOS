import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from fastapi import Request
from pydantic import BaseModel, TypeAdapter, ValidationError
from typing import Optional
from models.user import User
from models.resume_profile import ResumeProfile
from models.github_stats import GithubStats
from models.integration_profile import IntegrationProfile
from models.developer_intelligence import DeveloperIntelligence
from models.knowledge_graph import KnowledgeGraph
from models.generated_document import GeneratedDocument
from services.resume_intelligence_engine import infer_resume_data, analyze_ats_compatibility
from services.pdf_export_service import generate_resume_pdf_buffer
from middleware.auth import get_current_user
from middleware.rate_limit import limiter, LLM_LIMITS

router = APIRouter(prefix="/api/resume", tags=["resume"])

# Fields a client may edit; everything else (user, id, atsScore, ...) is server-owned.
EDITABLE_FIELDS = {
    "personalInfo", "careerObjective", "targetRole", "selectedTemplate", "education", "experience",
    "projects", "skills", "certifications", "hackathons", "categorizedSkills", "customSections", "achievements",
}


def apply_updates(document, body: dict, editable: set) -> None:
    """Validate each editable field against its model annotation before assigning it."""
    for key, value in body.items():
        if key not in editable:
            continue
        annotation = type(document).model_fields[key].annotation
        try:
            setattr(document, key, TypeAdapter(annotation).validate_python(value))
        except ValidationError as e:
            raise HTTPException(status_code=422, detail=f"Invalid value for '{key}': {e.errors()[0]['msg']}")


async def _infer_profile_fields(current_user: User, target_role: str) -> dict:
    uid = current_user.id
    github_stats = await GithubStats.find_one(GithubStats.user == uid)
    integration = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    intelligence = await DeveloperIntelligence.find_one(DeveloperIntelligence.user == uid)
    graph = await KnowledgeGraph.find_one(KnowledgeGraph.user == uid)
    inferred = await infer_resume_data(current_user, github_stats, integration, intelligence, graph, target_role)
    return {k: v for k, v in inferred.items() if k in EDITABLE_FIELDS}


# Regenerated from GitHub/LeetCode/GFG on every infer; everything else is user-owned and only filled if empty.
REGENERATED_FIELDS = {"careerObjective", "targetRole", "selectedTemplate", "projects", "skills", "categorizedSkills"}


def _merge_inferred(profile: ResumeProfile, inferred: dict) -> dict:
    """Combine freshly inferred data with the stored profile without discarding anything the user typed."""
    merged = {k: v for k, v in inferred.items() if k in REGENERATED_FIELDS}

    info = profile.personalInfo.model_dump()
    new_info = inferred.get("personalInfo", {})
    for key, value in new_info.items():
        if key == "customLinks":
            labels = {link.get("label") for link in info["customLinks"]}
            info["customLinks"] += [link for link in value if link.get("label") not in labels]
        elif key == "jobTitle":
            info[key] = value
        elif not info.get(key):
            info[key] = value
    merged["personalInfo"] = info

    for key in ("experience", "education", "certifications", "hackathons", "customSections"):
        if not getattr(profile, key) and inferred.get(key):
            merged[key] = inferred[key]

    # Replace auto-generated platform lines (they contain fresh counts) but keep the user's own achievements
    platform_lines = ("Solved ",)
    kept = [a for a in profile.achievements if not a.startswith(platform_lines)]
    merged["achievements"] = kept + inferred.get("achievements", [])
    return merged


@router.get("/profile")
async def get_resume_profile(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    profile = await ResumeProfile.find_one(ResumeProfile.user == uid)

    if not profile:
        profile = ResumeProfile(user=uid)
        apply_updates(profile, await _infer_profile_fields(current_user, "Software Engineer"), EDITABLE_FIELDS)
        ats_result = analyze_ats_compatibility(profile, profile.targetRole)
        profile.atsScore = ats_result["score"]
        profile.atsSuggestions = ats_result["suggestions"]
        profile.lastInferredAt = datetime.utcnow()
        await profile.insert()

    return profile.model_dump(by_alias=True)


@router.put("/profile")
async def update_resume_profile(body: dict, current_user: User = Depends(get_current_user)):
    profile = await ResumeProfile.find_one(ResumeProfile.user == current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Resume profile not found")

    apply_updates(profile, body, EDITABLE_FIELDS)
    ats_result = analyze_ats_compatibility(profile, profile.targetRole)
    profile.atsScore = ats_result["score"]
    profile.atsSuggestions = ats_result["suggestions"]
    await profile.save()
    return profile.model_dump(by_alias=True)


class InferRequest(BaseModel):
    targetRole: Optional[str] = "Software Engineer"


@router.post("/infer")
@limiter.limit(LLM_LIMITS["resume_infer"])
async def infer_resume(request: Request, body: InferRequest, current_user: User = Depends(get_current_user)):
    uid = current_user.id
    target_role = body.targetRole or "Software Engineer"

    profile = await ResumeProfile.find_one(ResumeProfile.user == uid)
    if not profile:
        profile = ResumeProfile(user=uid)

    inferred = await _infer_profile_fields(current_user, target_role)
    apply_updates(profile, _merge_inferred(profile, inferred), EDITABLE_FIELDS)
    ats_result = analyze_ats_compatibility(profile, target_role)
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

    raw_name = filename.strip() if filename and filename.strip() else f"{profile.personalInfo.fullName or 'Developer'}_Resume"
    clean_name = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", raw_name)
    final_filename = clean_name if clean_name.lower().endswith(".pdf") else f"{clean_name}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{final_filename}"'},
    )
