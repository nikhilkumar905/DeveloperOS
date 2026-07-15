import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from models.user import User
from models.activity_log import ActivityLog, ActivityMetadata
from models.activity_session import ActivitySession
from models.integration_profile import IntegrationProfile
from services.activity_aggregator import rebuild_daily_session, calculate_streak
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/activity", tags=["activity"])

VALID_PLATFORMS = {"github", "leetcode", "hackerrank", "codeforces", "geeksforgeeks", "stackoverflow", "docs", "other"}
VALID_TYPES = {
    "repo_visit", "repo_code_view", "repo_push", "repo_commit_view",
    "problem_view", "problem_solved", "problem_attempted", "article_read",
    "docs_read", "profile_view", "question_view", "answer_view",
    "contest_participated", "pr_view", "issue_view", "coding_session",
}
FEED_TYPES = {"repo_push", "repo_commit_view", "problem_solved", "problem_attempted", "contest_participated", "pr_view", "issue_view"}


# IST = UTC+5:30
IST = timezone(timedelta(hours=5, minutes=30))


def _to_date_string(d: datetime) -> str:
    """Return YYYY-MM-DD in IST for a UTC-aware or naive-UTC datetime."""
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(IST).strftime("%Y-%m-%d")


def _today_ist() -> str:
    return datetime.now(IST).strftime("%Y-%m-%d")


class ActivityEventPayload(BaseModel):
    platform: str
    activityType: str
    metadata: Optional[dict] = {}
    duration: float = 0
    timestamp: Optional[str] = None


class LogActivityRequest(BaseModel):
    events: List[ActivityEventPayload]


@router.post("/log", status_code=201)
async def log_activity(body: LogActivityRequest, current_user: User = Depends(get_current_user)):
    uid = current_user.id
    if not body.events:
        raise HTTPException(status_code=400, detail="No events provided")

    docs = []
    for e in body.events:
        if e.platform not in VALID_PLATFORMS or e.activityType not in VALID_TYPES:
            continue
        ts = datetime.fromisoformat(e.timestamp) if e.timestamp else datetime.utcnow()
        meta = e.metadata or {}
        docs.append(ActivityLog(
            user=uid,
            platform=e.platform,
            activityType=e.activityType,
            metadata=ActivityMetadata(
                url=meta.get("url", ""), title=meta.get("title", ""),
                repoName=meta.get("repoName", ""), repoOwner=meta.get("repoOwner", ""),
                problemName=meta.get("problemName", ""), problemSlug=meta.get("problemSlug", ""),
                difficulty=meta.get("difficulty"), language=meta.get("language", ""),
                tags=meta.get("tags", []), contestName=meta.get("contestName", ""),
                score=meta.get("score", 0),
            ),
            duration=e.duration or 0,
            timestamp=ts,
            synced=True,
        ))

    if not docs:
        raise HTTPException(status_code=400, detail="No valid events in batch")

    await ActivityLog.insert_many(docs)

    affected_dates = {_to_date_string(d.timestamp) for d in docs}
    for date in affected_dates:
        asyncio.create_task(rebuild_daily_session(uid, date))

    return {"message": f"Logged {len(docs)} events", "count": len(docs)}


@router.get("/feed")
async def get_activity_feed(
    page: int = 1,
    limit: int = 20,
    platform: Optional[str] = None,
    date: Optional[str] = None,
    month: Optional[str] = None,   # YYYY-MM — filter entire month
    current_user: User = Depends(get_current_user)
):
    uid = current_user.id
    page = max(1, page)
    limit = min(50, limit)

    # Build all filter conditions upfront
    conditions = [ActivityLog.user == uid]

    if platform and platform != "all":
        conditions.append(ActivityLog.platform == platform)

    if month:
        # Filter a full calendar month in IST
        try:
            year_int, month_int = int(month[:4]), int(month[5:7])
            import calendar
            last_day = calendar.monthrange(year_int, month_int)[1]
            day_start_ist = datetime(year_int, month_int, 1, 0, 0, 0).replace(tzinfo=IST)
            day_end_ist   = datetime(year_int, month_int, last_day, 23, 59, 59).replace(tzinfo=IST)
            start_utc = day_start_ist.astimezone(timezone.utc).replace(tzinfo=None)
            end_utc   = day_end_ist.astimezone(timezone.utc).replace(tzinfo=None)
            conditions.append(ActivityLog.timestamp >= start_utc)
            conditions.append(ActivityLog.timestamp <= end_utc)
        except Exception:
            pass
    elif date:
        # Convert the selected IST day to UTC window for querying stored naive-UTC timestamps
        day_start_ist = datetime.strptime(f"{date}T00:00:00", "%Y-%m-%dT%H:%M:%S").replace(tzinfo=IST)
        day_end_ist   = datetime.strptime(f"{date}T23:59:59", "%Y-%m-%dT%H:%M:%S").replace(tzinfo=IST)
        start_utc = day_start_ist.astimezone(timezone.utc).replace(tzinfo=None)
        end_utc   = day_end_ist.astimezone(timezone.utc).replace(tzinfo=None)
        conditions.append(ActivityLog.timestamp >= start_utc)
        conditions.append(ActivityLog.timestamp <= end_utc)

    query = ActivityLog.find(*conditions)
    total = await query.count()
    activities = await query.sort("-timestamp").skip((page - 1) * limit).limit(limit).to_list()

    return {
        "activities": [a.model_dump(by_alias=True) for a in activities],
        "pagination": {"page": page, "limit": limit, "total": total, "pages": -(-total // limit)},
    }


@router.get("/summary")
async def get_activity_summary(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    today = _today_ist()
    session = await ActivitySession.find_one(ActivitySession.user == uid, ActivitySession.date == today)

    if not session:
        streak = await calculate_streak(uid)
        return {"date": today, "totalTimeMs": 0, "platformBreakdown": {}, "problemsSolved": 0, "problemsAttempted": 0, "reposVisited": 0, "articlesRead": 0, "streak": streak, "productivityScore": 0, "longestSession": 0, "activePlatforms": [], "recentActivity": []}

    recent = await ActivityLog.find(ActivityLog.user == uid).sort("-timestamp").limit(5).to_list()
    result = session.model_dump(by_alias=True)
    result["recentActivity"] = [a.model_dump(by_alias=True) for a in recent]
    return result


@router.get("/weekly")
async def get_weekly_activity(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    now_ist = datetime.now(IST)
    days = [(now_ist - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6, -1, -1)]
    sessions = await ActivitySession.find(ActivitySession.user == uid, ActivitySession.date.in_(days)).to_list()
    session_map = {s.date: s.model_dump(by_alias=True) for s in sessions}
    result = [session_map.get(d, {"date": d, "totalTimeMs": 0, "problemsSolved": 0, "productivityScore": 0, "activePlatforms": [], "platformBreakdown": {}}) for d in days]
    return {"days": result}


@router.get("/heatmap")
async def get_heatmap_data(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    start_date = (datetime.now(IST) - timedelta(days=90)).strftime("%Y-%m-%d")
    sessions = await ActivitySession.find(ActivitySession.user == uid, ActivitySession.date >= start_date).to_list()
    return {"sessions": [{"date": s.date, "totalTimeMs": s.totalTimeMs, "problemsSolved": s.problemsSolved, "productivityScore": s.productivityScore} for s in sessions]}


MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

@router.get("/yearly")
async def get_yearly_activity(year: Optional[int] = None, current_user: User = Depends(get_current_user)):
    """Return monthly aggregated activity for a given year, plus list of years with data."""
    uid = current_user.id
    if not year:
        year = datetime.now(IST).year

    # Get all sessions for this user to find available years
    all_sessions = await ActivitySession.find(ActivitySession.user == uid).to_list()
    available_years = sorted({int(s.date[:4]) for s in all_sessions}, reverse=True)
    if not available_years:
        available_years = [datetime.now(IST).year]

    # Filter sessions for the requested year
    year_sessions = [s for s in all_sessions if s.date.startswith(str(year))]

    # Aggregate by month
    monthly: dict[str, dict] = {}
    for s in year_sessions:
        month = s.date[5:7]  # "MM"
        if month not in monthly:
            monthly[month] = {"totalTimeMs": 0.0, "problemsSolved": 0, "activeDays": 0}
        monthly[month]["totalTimeMs"] += s.totalTimeMs
        monthly[month]["problemsSolved"] += s.problemsSolved
        monthly[month]["activeDays"] += 1

    months = []
    for i in range(1, 13):
        m = f"{i:02d}"
        data = monthly.get(m, {"totalTimeMs": 0.0, "problemsSolved": 0, "activeDays": 0})
        months.append({
            "month": m,
            "label": MONTH_LABELS[i - 1],
            "year": year,
            **data,
        })

    return {"months": months, "year": year, "availableYears": available_years}


@router.get("/settings")
async def get_activity_settings(current_user: User = Depends(get_current_user)):
    profile = await IntegrationProfile.find_one(IntegrationProfile.user == current_user.id)
    defaults = {"github": True, "leetcode": True, "hackerrank": True, "codeforces": True, "geeksforgeeks": True, "stackoverflow": True, "docs": True}
    settings = (profile.activitySettings if profile else None) or defaults
    return {"settings": settings}


class SettingsRequest(BaseModel):
    settings: dict


@router.put("/settings")
async def update_activity_settings(body: SettingsRequest, current_user: User = Depends(get_current_user)):
    if not isinstance(body.settings, dict):
        raise HTTPException(status_code=400, detail="Invalid settings object")
    uid = current_user.id
    profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    if not profile:
        profile = IntegrationProfile(user=uid)
    profile.activitySettings = body.settings
    await profile.save()
    return {"message": "Settings updated", "settings": body.settings}


@router.delete("/logs")
async def clear_activity_logs(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    await ActivityLog.find(ActivityLog.user == uid).delete()
    await ActivitySession.find(ActivitySession.user == uid).delete()
    return {"message": "All activity logs and sessions cleared successfully."}
