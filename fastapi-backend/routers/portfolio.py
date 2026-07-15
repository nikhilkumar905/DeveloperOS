from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel
from typing import Optional
from models.user import User
from models.portfolio_settings import PortfolioSettings, SectionVisibility
from models.github_stats import GithubStats
from models.developer_intelligence import DeveloperIntelligence
from models.generated_document import GeneratedDocument
from services.portfolio_export_service import generate_portfolio_bundle_html
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/settings")
async def get_portfolio_settings(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    settings = await PortfolioSettings.find_one(PortfolioSettings.user == uid)
    if not settings:
        settings = PortfolioSettings(user=uid)
        await settings.insert()
    return settings.model_dump(by_alias=True)


@router.put("/settings")
async def update_portfolio_settings(body: dict, current_user: User = Depends(get_current_user)):
    uid = current_user.id
    settings = await PortfolioSettings.find_one(PortfolioSettings.user == uid)
    if not settings:
        raise HTTPException(status_code=404, detail="Portfolio settings not found")
    for key, value in body.items():
        if hasattr(settings, key):
            setattr(settings, key, value)
    await settings.save()
    return settings.model_dump(by_alias=True)


@router.get("/preview")
async def get_portfolio_preview(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    settings = await PortfolioSettings.find_one(PortfolioSettings.user == uid)
    if not settings:
        settings = PortfolioSettings(user=uid)
        await settings.insert()
    github_stats = await GithubStats.find_one(GithubStats.user == uid)
    intelligence = await DeveloperIntelligence.find_one(DeveloperIntelligence.user == uid)
    return {
        "user": {"name": current_user.name, "email": current_user.email},
        "settings": settings.model_dump(by_alias=True),
        "githubStats": github_stats.model_dump(by_alias=True) if github_stats else None,
        "intelligence": intelligence.model_dump(by_alias=True) if intelligence else None,
    }


@router.get("/export/bundle")
async def export_portfolio_bundle(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    settings = await PortfolioSettings.find_one(PortfolioSettings.user == uid)
    if not settings:
        settings = PortfolioSettings(user=uid)
    github_stats = await GithubStats.find_one(GithubStats.user == uid)
    intelligence = await DeveloperIntelligence.find_one(DeveloperIntelligence.user == uid)

    html_content = generate_portfolio_bundle_html(current_user, settings, github_stats, intelligence)

    await GeneratedDocument(
        user=uid,
        documentType="PORTFOLIO_BUNDLE",
        title=f"{current_user.name or 'Developer'}_Portfolio_Bundle",
        templateOrTheme=settings.theme or "modern-dark",
        atsScore=100,
        metadata={"theme": settings.theme, "color": settings.primaryColor},
    ).insert()

    return Response(
        content=html_content.encode("utf-8"),
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="portfolio_bundle_index.html"'},
    )
