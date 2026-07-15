from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from models.user import User
from models.integration_profile import IntegrationProfile, LeetcodeStats
from models.timeline_event import TimelineEvent
from services.leetcode_service import fetch_leetcode_profile
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/leetcode", tags=["leetcode"])


class UsernameRequest(BaseModel):
    username: str


@router.post("/connect")
async def connect_leetcode(body: UsernameRequest, current_user: User = Depends(get_current_user)):
    if not body.username:
        raise HTTPException(status_code=400, detail="Username is required")

    stats_data = await fetch_leetcode_profile(body.username)
    uid = current_user.id

    profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    if not profile:
        profile = IntegrationProfile(user=uid)

    profile.leetcodeUsername = body.username
    profile.leetcodeStats = LeetcodeStats(**stats_data, lastSyncedAt=datetime.utcnow())
    await profile.save()

    await TimelineEvent(user=uid, title="LeetCode Connected", description=f"Linked LeetCode account: {body.username}", type="leetcode").insert()
    return profile.leetcodeStats.model_dump()


@router.post("/disconnect")
async def disconnect_leetcode(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    if profile:
        profile.leetcodeUsername = ""
        profile.leetcodeStats = LeetcodeStats()
        await profile.save()
    return {"message": "LeetCode disconnected"}


@router.post("/sync")
async def sync_leetcode(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    if not profile or not profile.leetcodeUsername:
        raise HTTPException(status_code=400, detail="LeetCode not connected")

    stats_data = await fetch_leetcode_profile(profile.leetcodeUsername)
    profile.leetcodeStats = LeetcodeStats(**stats_data, lastSyncedAt=datetime.utcnow())
    await profile.save()
    return profile.leetcodeStats.model_dump()


@router.get("/stats")
async def get_leetcode_stats(current_user: User = Depends(get_current_user)):
    profile = await IntegrationProfile.find_one(IntegrationProfile.user == current_user.id)
    if not profile or not profile.leetcodeUsername:
        return None
    return {"username": profile.leetcodeUsername, "stats": profile.leetcodeStats.model_dump()}
