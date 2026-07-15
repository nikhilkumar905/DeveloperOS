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
        
    prompt = f"""You are an expert Developer Intelligence AI evaluating a software engineer's profile based strictly on their actual GitHub and LeetCode activity.

GITHUB STATS:
- Commits: {total_commits}
- PRs: {total_prs}
- Issues: {total_issues}
- Repositories: {json.dumps(repos, indent=2)}

LEETCODE STATS:
- Solved: {lc_solved}
- Streak: {lc_streak}
- Contest Rating: {lc_rating}

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
1. ONLY include technologies and skills directly evident from their repositories and LeetCode stats.
2. Link specific "Technology" nodes to high-level "Concept" or "Skill" nodes in the graph. Create 10-25 nodes depending on the variety of their repos.
3. Be brutally honest in scores. If they have 0 Leetcode solved, DSA score must be very low. If they have no backend repos, backend score should be low.
4. Output ONLY valid JSON.
"""

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise ValueError("GROQ_API_KEY is not set")
        
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            },
            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
        )
        
    resp.raise_for_status()
    parsed = resp.json()["choices"][0]["message"]["content"]
    data = json.loads(parsed)
    
    # Ensure all required score keys exist with defaults
    default_scores = {
        "dsa": 0, "frontend": 0, "backend": 0, "fullStack": 0, "devops": 0,
        "aiMl": 0, "database": 0, "security": 0, "cloud": 0, "consistency": 0,
        "productivity": 0, "interviewReadiness": 0, "overallScore": 0
    }
    s = data.get("scores", {})
    for k in default_scores:
        if k not in s:
            s[k] = 0
    data["scores"] = s
    
    if "knowledge_graph" not in data or "nodes" not in data["knowledge_graph"]:
        data["knowledge_graph"] = {"nodes": [], "edges": []}
        
    return data
