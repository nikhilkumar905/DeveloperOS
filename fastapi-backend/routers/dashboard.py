from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models.user import User
from models.goal import Goal
from models.notification import Notification
from models.timeline_event import TimelineEvent
from models.integration_profile import IntegrationProfile
from models.github_stats import GithubStats
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    profile = await IntegrationProfile.find_one(IntegrationProfile.user == user_id)

    if not profile:
        profile = IntegrationProfile(user=user_id)
        await profile.insert()
        await Notification(user=user_id, message="Welcome to PersonalOS! Connect GitHub and LeetCode to get started.", type="info").insert()
        await TimelineEvent(user=user_id, title="Account Created", description="Joined PersonalOS developer workspace!", type="milestone").insert()

    github_stats = await GithubStats.find_one(GithubStats.user == user_id)
    active_projects_count = len(github_stats.repositories) if github_stats else 0

    return {
        "githubUsername": profile.githubUsername or None,
        "leetcodeUsername": profile.leetcodeUsername or None,
        "leetcodeStats": profile.leetcodeStats.model_dump() if profile.leetcodeStats else None,
        "activeProjectsCount": active_projects_count,
        "lastSyncedAt": github_stats.lastSyncedAt.isoformat() if github_stats and github_stats.lastSyncedAt else None,
    }


class GoalRequest(BaseModel):
    title: str
    targetValue: float
    unit: str
    deadline: str


@router.get("/goals")
async def get_goals(current_user: User = Depends(get_current_user)):
    goals = await Goal.find(Goal.user == current_user.id).sort("-createdAt").to_list()
    return [{**g.model_dump(by_alias=True), "_id": str(g.id)} for g in goals]


@router.post("/goals", status_code=201)
async def create_goal(body: GoalRequest, current_user: User = Depends(get_current_user)):
    if not body.title or not body.targetValue or not body.unit or not body.deadline:
        raise HTTPException(status_code=400, detail="title, targetValue, unit, and deadline are required")

    goal = Goal(user=current_user.id, title=body.title.strip(), targetValue=body.targetValue, unit=body.unit.strip(), deadline=body.deadline)
    await goal.insert()
    await TimelineEvent(user=current_user.id, title="Goal Started", description=f"New goal set: {body.title} ({body.targetValue} {body.unit})", type="milestone").insert()
    return {**goal.model_dump(by_alias=True), "_id": str(goal.id)}


@router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = await Notification.find(Notification.user == current_user.id).sort("-createdAt").limit(20).to_list()
    return [{**n.model_dump(by_alias=True), "_id": str(n.id)} for n in notifications]


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    from beanie import PydanticObjectId
    notif = await Notification.find_one(Notification.id == PydanticObjectId(notification_id), Notification.user == current_user.id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read = True
    await notif.save()
    return {**notif.model_dump(by_alias=True), "_id": str(notif.id)}


@router.get("/timeline")
async def get_timeline(page: int = 1, limit: int = 20, current_user: User = Depends(get_current_user)):
    page = max(1, page)
    limit = min(50, limit)
    events = await TimelineEvent.find(TimelineEvent.user == current_user.id).sort("-timestamp").skip((page - 1) * limit).limit(limit).to_list()
    return [{**e.model_dump(by_alias=True), "_id": str(e.id)} for e in events]
