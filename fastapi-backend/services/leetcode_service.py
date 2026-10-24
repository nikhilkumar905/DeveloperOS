from typing import Dict, Any, List
import httpx

LEETCODE_API = "https://leetcode.com/graphql"

QUERY = """
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
    submitStats: submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
    }
    badges {
      id
      name
    }
  }
  userContestRanking(username: $username) {
    rating
  }
  recentAcSubmissionList(username: $username, limit: 5) {
    title
    titleSlug
    timestamp
  }
}
"""


class LeetcodeUnavailable(RuntimeError):
    pass


async def fetch_leetcode_profile(username: str) -> Dict[str, Any]:
    """Raises ValueError if the user doesn't exist, LeetcodeUnavailable if LeetCode can't be reached."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                LEETCODE_API,
                json={"query": QUERY, "variables": {"username": username}},
                headers={"Content-Type": "application/json", "Referer": "https://leetcode.com"},
                timeout=15.0,
            )
        data = response.json()
    except (httpx.HTTPError, ValueError) as e:
        raise LeetcodeUnavailable(f"Could not reach LeetCode: {e}") from e

    if data.get("errors"):
        raise ValueError(data["errors"][0]["message"])

    inner = data.get("data") or {}
    if not inner.get("matchedUser"):
        raise ValueError("User not found on LeetCode")

    submit_stats = inner["matchedUser"]["submitStats"]["acSubmissionNum"]
    stats_map: Dict[str, Any] = {s["difficulty"]: s for s in submit_stats}

    solved_total = stats_map.get("All", {}).get("count", 0)
    solved_easy = stats_map.get("Easy", {}).get("count", 0)
    solved_medium = stats_map.get("Medium", {}).get("count", 0)
    solved_hard = stats_map.get("Hard", {}).get("count", 0)
    submissions = stats_map.get("All", {}).get("submissions", 0)

    contest_rating_raw = inner.get("userContestRanking") or {}
    contest_rating = round(contest_rating_raw.get("rating", 0)) if contest_rating_raw.get("rating") else 0
    badges = len(inner["matchedUser"].get("badges", []))

    recent_activity: List[Dict] = []
    for sub in inner.get("recentAcSubmissionList") or []:
        recent_activity.append({
            "title": sub["title"],
            "date": str(int(sub["timestamp"]) * 1000),
            "difficulty": "Unknown",
        })

    return {
        "solvedTotal": solved_total,
        "solvedEasy": solved_easy,
        "solvedMedium": solved_medium,
        "solvedHard": solved_hard,
        "submissions": submissions,
        "contestRating": contest_rating,
        "badges": badges,
        "streak": 0,
        "recentActivity": recent_activity,
    }
