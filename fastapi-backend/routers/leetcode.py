from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from models.user import User
from models.integration_profile import IntegrationProfile, LeetcodeStats
from models.timeline_event import TimelineEvent
from services.leetcode_service import fetch_leetcode_profile, LeetcodeUnavailable
from middleware.auth import get_current_user
from routers.analytics import invalidate_insights

router = APIRouter(prefix="/api/leetcode", tags=["leetcode"])


class UsernameRequest(BaseModel):
    username: str


async def _fetch_stats(username: str) -> dict:
    try:
        return await fetch_leetcode_profile(username)
    except LeetcodeUnavailable as e:
        raise HTTPException(status_code=502, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/connect")
async def connect_leetcode(body: UsernameRequest, current_user: User = Depends(get_current_user)):
    username = body.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    stats_data = await _fetch_stats(username)
    uid = current_user.id

    profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    if not profile:
        profile = IntegrationProfile(user=uid)

    profile.leetcodeUsername = username
    profile.leetcodeStats = LeetcodeStats(**stats_data, lastSyncedAt=datetime.utcnow())
    await profile.save()
    await invalidate_insights(uid)

    await TimelineEvent(user=uid, title="LeetCode Connected", description=f"Linked LeetCode account: {username}", type="leetcode").insert()
    return profile.leetcodeStats.model_dump()


@router.post("/disconnect")
async def disconnect_leetcode(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    if profile:
        profile.leetcodeUsername = ""
        profile.leetcodeStats = LeetcodeStats()
        await profile.save()
        await invalidate_insights(uid)
    return {"message": "LeetCode disconnected"}


@router.post("/sync")
async def sync_leetcode(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    if not profile or not profile.leetcodeUsername:
        raise HTTPException(status_code=400, detail="LeetCode not connected")

    stats_data = await _fetch_stats(profile.leetcodeUsername)
    changed = profile.leetcodeStats.solvedTotal != stats_data.get("solvedTotal")
    profile.leetcodeStats = LeetcodeStats(**stats_data, lastSyncedAt=datetime.utcnow())
    await profile.save()
    if changed:
        await invalidate_insights(uid)
    return profile.leetcodeStats.model_dump()


@router.get("/stats")
async def get_leetcode_stats(current_user: User = Depends(get_current_user)):
    profile = await IntegrationProfile.find_one(IntegrationProfile.user == current_user.id)
    if not profile or not profile.leetcodeUsername:
        return None
    return {"username": profile.leetcodeUsername, "stats": profile.leetcodeStats.model_dump()}
