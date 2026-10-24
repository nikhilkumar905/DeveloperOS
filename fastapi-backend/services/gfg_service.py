import asyncio
from typing import Dict, Any, List
import httpx

GFG_PROFILE_API = "https://authapi.geeksforgeeks.org/api-get/user-profile-info/"
GFG_SUBMISSIONS_API = "https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/"

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (DeveloperOS)",
    "Referer": "https://www.geeksforgeeks.org/",
}


class GfgUserNotFound(ValueError):
    pass


class GfgUnavailable(RuntimeError):
    pass


def _to_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


async def fetch_gfg_profile(username: str) -> Dict[str, Any]:
    """Fetch a GeeksforGeeks user's profile + solved problems from GFG's public APIs."""
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=15.0) as client:
            profile_resp, subs_resp = await asyncio.gather(
                client.get(GFG_PROFILE_API, params={"handle": username}),
                client.post(GFG_SUBMISSIONS_API, json={"handle": username, "requestType": "", "year": "", "month": ""}),
            )
    except httpx.HTTPError as e:
        raise GfgUnavailable(f"Could not reach GeeksforGeeks: {e}") from e

    try:
        profile_json = profile_resp.json()
    except ValueError:
        raise GfgUnavailable("GeeksforGeeks returned an unexpected response")

    profile = profile_json.get("data") if isinstance(profile_json, dict) else None
    if not profile:
        if profile_resp.status_code in (400, 404) or "not found" in str(profile_json.get("message", "")).lower():
            raise GfgUserNotFound("User not found on GeeksforGeeks")
        raise GfgUnavailable("GeeksforGeeks returned an unexpected response")

    # The submissions API is best-effort: a failure here should not block connecting.
    buckets: Dict[str, Dict[str, Any]] = {}
    try:
        subs_json = subs_resp.json()
        if isinstance(subs_json, dict) and isinstance(subs_json.get("result"), dict):
            buckets = subs_json["result"]
    except ValueError:
        pass

    def bucket_count(name: str) -> int:
        return len(buckets.get(name) or {})

    languages: Dict[str, int] = {}
    submissions: List[Dict[str, Any]] = []
    for difficulty, problems in buckets.items():
        for problem in (problems or {}).values():
            lang = problem.get("lang") or "unknown"
            languages[lang] = languages.get(lang, 0) + 1
            submissions.append({
                "title": problem.get("pname", ""),
                "slug": problem.get("slug", ""),
                "difficulty": difficulty,
                "language": lang,
                "date": problem.get("user_subtime", ""),
            })
    # user_subtime is "YYYY-MM-DD HH:MM:SS", so string order is chronological
    submissions.sort(key=lambda s: s["date"], reverse=True)

    solved_by_difficulty = sum(bucket_count(d) for d in ("School", "Basic", "Easy", "Medium", "Hard"))

    return {
        "solvedTotal": _to_int(profile.get("total_problems_solved")) or solved_by_difficulty,
        "solvedSchool": bucket_count("School"),
        "solvedBasic": bucket_count("Basic"),
        "solvedEasy": bucket_count("Easy"),
        "solvedMedium": bucket_count("Medium"),
        "solvedHard": bucket_count("Hard"),
        "codingScore": _to_int(profile.get("score")),
        "monthlyScore": _to_int(profile.get("monthly_score")),
        "currentStreak": _to_int(profile.get("pod_solved_current_streak")),
        "longestStreak": _to_int(profile.get("pod_solved_longest_streak")),
        "instituteName": profile.get("institute_name") or "",
        "instituteRank": str(profile.get("institute_rank") or ""),
        "articlesPublished": _to_int(profile.get("total_articles_published")),
        "languages": languages,
        "recentActivity": submissions[:5],
    }
