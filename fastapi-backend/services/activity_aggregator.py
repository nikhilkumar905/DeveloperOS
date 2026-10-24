from typing import Set
from datetime import datetime, timedelta, timezone
from beanie import PydanticObjectId
from models.activity_log import ActivityLog
from models.activity_session import ActivitySession


# IST = UTC+5:30
IST = timezone(timedelta(hours=5, minutes=30))


def _to_date_string(d: datetime) -> str:
    """Format a datetime to YYYY-MM-DD string in IST."""
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(IST).strftime("%Y-%m-%d")


def _compute_productivity_score(
    total_time_ms: float,
    problems_solved: int,
    active_platforms_count: int,
    articles_read: int,
) -> int:
    time_score = min(50, (total_time_ms / (2 * 60 * 60 * 1000)) * 50)
    problem_score = min(30, problems_solved * 8)
    variety_score = min(15, active_platforms_count * 3)
    learning_score = min(5, articles_read)
    return round(time_score + problem_score + variety_score + learning_score)


async def calculate_streak(user_id: PydanticObjectId) -> int:
    sessions = await ActivitySession.find(
        ActivitySession.user == user_id
    ).sort("-date").project(ActivitySession).to_list()

    if not sessions:
        return 0

    active_dates: Set[str] = {s.date for s in sessions}
    streak = 0
    current = datetime.now(IST)

    if _to_date_string(current) not in active_dates:
        current -= timedelta(days=1)
        if _to_date_string(current) not in active_dates:
            return 0

    while _to_date_string(current) in active_dates:
        streak += 1
        current -= timedelta(days=1)

    return streak


async def rebuild_daily_session(user_id: PydanticObjectId, date: str) -> None:
    """Aggregates all ActivityLog entries for a day into an ActivitySession.
    `date` is a YYYY-MM-DD string in IST. Timestamps in DB are naive UTC.
    We convert the IST day boundaries to UTC for querying.
    """
    day_start_ist = datetime.strptime(f"{date}T00:00:00", "%Y-%m-%dT%H:%M:%S").replace(tzinfo=IST)
    day_end_ist   = datetime.strptime(f"{date}T23:59:59", "%Y-%m-%dT%H:%M:%S").replace(tzinfo=IST)
    start_utc = day_start_ist.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc   = day_end_ist.astimezone(timezone.utc).replace(tzinfo=None)

    logs = await ActivityLog.find(
        ActivityLog.user == user_id,
        ActivityLog.timestamp >= start_utc,
        ActivityLog.timestamp <= end_utc,
    ).to_list()

    if not logs:
        return

    platform_breakdown = {
        p: 0.0 for p in ["github", "leetcode", "hackerrank", "codeforces",
                          "geeksforgeeks", "stackoverflow", "docs", "other"]
    }

    problems_solved = 0
    problems_attempted = 0
    repos_visited = 0
    articles_read = 0
    total_time_ms = 0.0
    longest_session = 0.0

    for log in logs:
        platform_breakdown[log.platform] = platform_breakdown.get(log.platform, 0) + log.duration
        total_time_ms += log.duration
        if log.duration > longest_session:
            longest_session = log.duration
        if log.activityType == "problem_solved":
            problems_solved += 1
        if log.activityType == "problem_attempted":
            problems_attempted += 1
        if log.activityType in ("repo_visit", "repo_push"):
            repos_visited += 1
        if log.activityType in ("article_read", "docs_read"):
            articles_read += 1

    active_platforms = [p for p, ms in platform_breakdown.items() if ms > 0]
    productivity_score = _compute_productivity_score(
        total_time_ms, problems_solved, len(active_platforms), articles_read
    )
    streak = await calculate_streak(user_id)

    existing = await ActivitySession.find_one(
        ActivitySession.user == user_id,
        ActivitySession.date == date,
    )

    if existing:
        existing.totalTimeMs = total_time_ms
        existing.platformBreakdown = platform_breakdown
        existing.problemsSolved = problems_solved
        existing.problemsAttempted = problems_attempted
        existing.reposVisited = repos_visited
        existing.articlesRead = articles_read
        existing.streak = streak
        existing.productivityScore = productivity_score
        existing.longestSession = longest_session
        existing.activePlatforms = active_platforms
        existing.updatedAt = datetime.utcnow()
        await existing.save()
    else:
        await ActivitySession(
            user=user_id,
            date=date,
            totalTimeMs=total_time_ms,
            platformBreakdown=platform_breakdown,
            problemsSolved=problems_solved,
            problemsAttempted=problems_attempted,
            reposVisited=repos_visited,
            articlesRead=articles_read,
            streak=streak,
            productivityScore=productivity_score,
            longestSession=longest_session,
            activePlatforms=active_platforms,
        ).insert()
