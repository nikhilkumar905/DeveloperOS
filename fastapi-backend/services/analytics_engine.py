import os
import json
from typing import Optional, Dict, Any
import httpx


async def calculate_developer_intelligence(github_stats, integration_profile) -> Dict[str, Any]:
    repos = []
    total_commits = 0
    total_prs = 0
    total_issues = 0
    
    if github_stats:
        total_commits = github_stats.aggregatedStats.totalCommits
        total_prs = github_stats.aggregatedStats.totalPRs
        total_issues = github_stats.aggregatedStats.totalIssues
        for r in github_stats.repositories[:20]:
            repos.append({
                "name": r.name,
                "description": r.description or "No description",
                "language": r.language or "Unknown",
                "stars": r.stars,
                "forks": r.forks,
                "topics_and_languages": r.languages or [],
                "dependencies": r.dependencies[:20] if getattr(r, 'dependencies', None) else [],
            })
            
    lc_solved = 0
    lc_streak = 0
    lc_rating = 0
    if integration_profile and integration_profile.leetcodeStats:
        lc_solved = integration_profile.leetcodeStats.solvedTotal
        lc_streak = integration_profile.leetcodeStats.streak
        lc_rating = integration_profile.leetcodeStats.contestRating

    gfg = integration_profile.gfgStats if integration_profile and integration_profile.gfgUsername else None
    gfg_section = "Not connected"
    if gfg:
        gfg_section = (
            f"Solved: {gfg.solvedTotal} (School {gfg.solvedSchool}, Basic {gfg.solvedBasic}, Easy {gfg.solvedEasy}, "
            f"Medium {gfg.solvedMedium}, Hard {gfg.solvedHard}), Coding Score: {gfg.codingScore}, "
            f"Longest POTD Streak: {gfg.longestStreak}, Languages: {', '.join(gfg.languages.keys()) or 'Unknown'}"
        )

    prompt = f"""You are an expert Developer Intelligence AI evaluating a software engineer's profile based strictly on their actual GitHub, LeetCode and GeeksforGeeks activity.

GITHUB STATS:
- Commits: {total_commits}
- PRs: {total_prs}
- Issues: {total_issues}
- Repositories: {json.dumps(repos, indent=2)}

LEETCODE STATS:
- Solved: {lc_solved}
- Streak: {lc_streak}
- Contest Rating: {lc_rating}

GEEKSFORGEEKS STATS:
- {gfg_section}

Based entirely on this context, output a JSON object exactly matching this schema:
{{
  "scores": {{
    "dsa": <0-100 int>,
    "frontend": <0-100 int>,
    "backend": <0-100 int>,
    "fullStack": <0-100 int>,
    "devops": <0-100 int>,
    "aiMl": <0-100 int>,
    "database": <0-100 int>,
    "security": <0-100 int>,
    "cloud": <0-100 int>,
    "consistency": <0-100 int>,
    "productivity": <0-100 int>,
    "interviewReadiness": <0-100 int>,
    "overallScore": <0-100 int>
  }},
  "strengths": [<3-4 specific strings reflecting their actual repos/stats>],
  "weaknesses": [<2-3 specific strings>],
  "recommendations": [<2-3 specific strings>],
  "roadmap": [<3-4 strategic steps to improve>],
  "knowledge_graph": {{
    "nodes": [
      {{"id": "react", "label": "React", "type": "Technology", "properties": {{"confidence": 90}}}},
      {{"id": "frontend", "label": "Frontend Development", "type": "Skill", "properties": {{"confidence": 85}}}}
    ],
    "edges": [
      {{"source": "react", "target": "frontend", "relationship": "enables", "weight": 1.0}}
    ]
  }}
}}

Important Guidelines:
1. ONLY include technologies and skills directly evident from their repositories and LeetCode/GeeksforGeeks stats.
2. Link specific "Technology" nodes to high-level "Concept" or "Skill" nodes in the graph. Create 10-25 nodes depending on the variety of their repos.
3. Be brutally honest in scores. If they have 0 LeetCode and 0 GeeksforGeeks problems solved, DSA score must be very low. If they have no backend repos, backend score should be low.
4. Output ONLY valid JSON.
"""

    context = {
        "repos": repos, "total_commits": total_commits, "total_prs": total_prs,
        "dsa_solved": lc_solved + (gfg.solvedTotal if gfg else 0),
        "hard_solved": (integration_profile.leetcodeStats.solvedHard if integration_profile else 0) + (gfg.solvedHard if gfg else 0),
    }

    try:
        data = await ask_groq_json(prompt)
    except Exception as e:
        print(f"[analytics] LLM scoring unavailable, using heuristic fallback: {e}")
        data = _heuristic_intelligence(context)

    scores = data.get("scores") if isinstance(data.get("scores"), dict) else {}
    data["scores"] = {k: _clamp_score(scores.get(k, 0)) for k in SCORE_KEYS}
    for key in ("strengths", "weaknesses", "recommendations", "roadmap"):
        value = data.get(key)
        data[key] = [str(v) for v in value] if isinstance(value, list) else []

    if not isinstance(data.get("knowledge_graph"), dict) or "nodes" not in data["knowledge_graph"]:
        data["knowledge_graph"] = {"nodes": [], "edges": []}

    return data


SCORE_KEYS = [
    "dsa", "frontend", "backend", "fullStack", "devops", "aiMl", "database", "security",
    "cloud", "consistency", "productivity", "interviewReadiness", "overallScore",
]


def _clamp_score(value: Any) -> int:
    try:
        return max(0, min(100, round(float(value))))
    except (TypeError, ValueError):
        return 0


async def ask_groq_json(prompt: str) -> Dict[str, Any]:
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise ValueError("GROQ_API_KEY is not set")

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json={
                # llama-3.1-8b-instant was retired by Groq
                "model": os.getenv("GROQ_MODEL", "openai/gpt-oss-20b"),
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 4000,
                "reasoning_effort": "low",
                "response_format": {"type": "json_object"},
            },
            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
        )
    resp.raise_for_status()
    data = json.loads(resp.json()["choices"][0]["message"]["content"])
    if not isinstance(data, dict):
        raise ValueError("LLM returned non-object JSON")
    return data


FRONTEND_HINTS = {"javascript", "typescript", "html", "css", "react", "vue", "svelte", "next", "tailwindcss"}
BACKEND_HINTS = {"python", "java", "go", "express", "fastapi", "django", "flask", "spring", "node", "mongoose", "c#"}
DB_HINTS = {"mongoose", "mongodb", "pg", "mysql", "prisma", "redis", "sqlalchemy", "sql"}
AI_HINTS = {"jupyter notebook", "langchain", "transformers", "torch", "tensorflow", "scikit-learn", "openai", "groq"}


def _heuristic_intelligence(ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic scores so insights still work when the LLM is unavailable."""
    tokens = set()
    for r in ctx["repos"]:
        tokens.update(t.lower() for t in r["topics_and_languages"])
        tokens.update(d.lower() for d in r["dependencies"])
        tokens.add(r["language"].lower())

    def coverage(hints: set, per_hit: int = 25) -> int:
        return min(100, len(tokens & hints) * per_hit)

    solved = ctx["dsa_solved"]
    dsa = min(100, solved // 4 + ctx["hard_solved"] * 2)
    frontend = coverage(FRONTEND_HINTS)
    backend = coverage(BACKEND_HINTS)
    database = coverage(DB_HINTS, 35)
    ai_ml = coverage(AI_HINTS, 35)
    consistency = min(100, ctx["total_commits"] // 5)
    productivity = min(100, len(ctx["repos"]) * 5 + ctx["total_prs"] * 2)
    full_stack = round((frontend + backend) / 2) if frontend and backend else 0
    interview = round(dsa * 0.7 + max(frontend, backend) * 0.3)
    overall = round((dsa + frontend + backend + consistency + productivity) / 5)

    strengths, weaknesses, recommendations = [], [], []
    if solved >= 100:
        strengths.append(f"Solid problem-solving practice with {solved} DSA problems solved")
    if backend >= 50:
        strengths.append("Hands-on backend development experience across repositories")
    if frontend >= 50:
        strengths.append("Experience building frontend interfaces")
    if len(ctx["repos"]) >= 5:
        strengths.append(f"Maintains {len(ctx['repos'])} public repositories")
    if solved < 50:
        weaknesses.append("Limited DSA practice on LeetCode/GeeksforGeeks")
        recommendations.append("Solve 2-3 DSA problems daily on LeetCode or GeeksforGeeks")
    if consistency < 40:
        weaknesses.append("Commit activity is infrequent")
        recommendations.append("Commit small, regular changes to build a consistent contribution history")
    if database < 35:
        weaknesses.append("Little evidence of database work")
        recommendations.append("Build a project that uses a relational or document database end-to-end")

    return {
        "scores": {
            "dsa": dsa, "frontend": frontend, "backend": backend, "fullStack": full_stack,
            "devops": 0, "aiMl": ai_ml, "database": database, "security": 0, "cloud": 0,
            "consistency": consistency, "productivity": productivity,
            "interviewReadiness": interview, "overallScore": overall,
        },
        "strengths": strengths or ["Getting started — connect more platforms for richer insights"],
        "weaknesses": weaknesses,
        "recommendations": recommendations,
        "roadmap": [
            "Strengthen DSA fundamentals with a daily practice routine",
            "Ship one full-stack project with authentication, a database and deployment",
            "Write READMEs and descriptions for your top repositories",
        ],
    }
