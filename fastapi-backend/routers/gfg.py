from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from models.user import User
from models.integration_profile import IntegrationProfile, GfgStats
from models.timeline_event import TimelineEvent
from services.gfg_service import fetch_gfg_profile, GfgUnavailable, GfgUserNotFound
from middleware.auth import get_current_user
from routers.analytics import invalidate_insights

router = APIRouter(prefix="/api/gfg", tags=["gfg"])


class UsernameRequest(BaseModel):
    username: str


async def _fetch_stats(username: str) -> dict:
    try:
        return await fetch_gfg_profile(username)
    except GfgUnavailable as e:
        raise HTTPException(status_code=502, detail=str(e))
    except GfgUserNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/connect")
async def connect_gfg(body: UsernameRequest, current_user: User = Depends(get_current_user)):
    username = body.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    stats_data = await _fetch_stats(username)
    uid = current_user.id

    profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    if not profile:
        profile = IntegrationProfile(user=uid)

    profile.gfgUsername = username
    profile.gfgStats = GfgStats(**stats_data, lastSyncedAt=datetime.utcnow())
    await profile.save()
    await invalidate_insights(uid)

    await TimelineEvent(user=uid, title="GeeksforGeeks Connected", description=f"Linked GeeksforGeeks account: {username}", type="gfg").insert()
    return profile.gfgStats.model_dump()


@router.post("/disconnect")
async def disconnect_gfg(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    if profile:
        profile.gfgUsername = ""
        profile.gfgStats = GfgStats()
        await profile.save()
        await invalidate_insights(uid)
    return {"message": "GeeksforGeeks disconnected"}


@router.post("/sync")
async def sync_gfg(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    if not profile or not profile.gfgUsername:
        raise HTTPException(status_code=400, detail="GeeksforGeeks not connected")

    stats_data = await _fetch_stats(profile.gfgUsername)
    changed = profile.gfgStats.solvedTotal != stats_data.get("solvedTotal")
    profile.gfgStats = GfgStats(**stats_data, lastSyncedAt=datetime.utcnow())
    await profile.save()
    if changed:
        await invalidate_insights(uid)
    return profile.gfgStats.model_dump()


@router.get("/stats")
async def get_gfg_stats(current_user: User = Depends(get_current_user)):
    profile = await IntegrationProfile.find_one(IntegrationProfile.user == current_user.id)
    if not profile or not profile.gfgUsername:
        return None
    return {"username": profile.gfgUsername, "stats": profile.gfgStats.model_dump()}
