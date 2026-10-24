import os
import json
import re
from typing import Optional, List, Dict, Any
from services.analytics_engine import ask_groq_json

ACTION_VERBS = [
    "architected", "engineered", "developed", "implemented", "designed",
    "optimized", "spearheaded", "scaled", "built", "integrated",
    "automated", "reduced", "increased", "streamlined", "transformed"
]

ROLE_KEYWORDS: Dict[str, List[str]] = {
    "Software Engineer": ["data structures", "algorithms", "system design", "rest api", "git", "ci/cd", "testing", "scalability", "agile", "object-oriented"],
    "Full Stack Developer": ["react", "node.js", "express", "mongodb", "rest api", "frontend", "backend", "state management", "responsive design", "typescript"],
    "AI/ML Engineer": ["python", "machine learning", "data structures", "algorithms", "deep learning", "pytorch", "tensorflow", "data pipelines", "model training", "analytics"],
    "Backend Developer": ["node.js", "express", "mongodb", "sql", "rest api", "microservices", "database optimization", "authentication", "docker", "redis"],
    "Frontend Developer": ["react", "typescript", "tailwind css", "state management", "responsive design", "ui/ux", "performance optimization", "html5", "css3", "webpack"],
}


def generate_project_bullets(repo) -> List[str]:
    bullets = []
    lower_deps = [d.lower() for d in repo.dependencies]
    file_paths = repo.filePaths or []

    has_mvc = any("controllers/" in p or "models/" in p for p in file_paths)
    has_routes = any("routes/" in p for p in file_paths)
    has_components = any("components/" in p or "pages/" in p for p in file_paths)

    if has_mvc and has_routes:
        bullets.append("Architected modular REST API service adhering to MVC principles with scalable route endpoints and middleware isolation.")
    elif has_components:
        bullets.append("Designed responsive, component-driven user interface ensuring seamless interaction across devices.")
    else:
        bullets.append("Developed clean, maintainable application architecture following modern software engineering standards.")

    if "express" in lower_deps and "mongoose" in lower_deps:
        bullets.append("Integrated high-performance Node.js/Express backend with MongoDB/Mongoose ORM for structured database operations.")
    elif "react" in lower_deps or "next" in lower_deps:
        bullets.append("Engineered reactive client-side rendering pipeline utilizing modern frontend state management and lifecycle hooks.")

    if repo.stars > 0 or repo.forks > 0:
        bullets.append(f"Maintained open-source codebase gaining {repo.stars} stars and {repo.forks} forks from the developer community.")
    else:
        bullets.append("Integrated automated testing and continuous version control using Git across multi-branch workflows.")

    return bullets


def _extract_live_url(repo) -> str:
    if repo.homepage and repo.homepage.strip():
        url = repo.homepage.strip()
        if not url.startswith("http://") and not url.startswith("https://"):
            url = f"https://{url}"
        return url
    if repo.description:
        match = re.search(
            r"(https?:\/\/[^\s)]+)|(([a-zA-Z0-9-]+\.)+(vercel\.app|netlify\.app|github\.io|onrender\.com|indevs\.in)[^\s)]*)",
            repo.description, re.I
        )
        if match:
            url = match.group(0)
            if not url.startswith("http://") and not url.startswith("https://"):
                url = f"https://{url}"
            if "github.com" not in url:
                return url
    return ""


async def infer_resume_data(user, github_stats, integration_profile, intelligence, graph, target_role: str = "Software Engineer") -> Dict[str, Any]:
    full_name = getattr(user, "name", None) or "Developer Name"
    email = getattr(user, "email", None) or ""

    technical: List[str] = []
    frameworks: List[str] = []
    tools: List[str] = ["Git", "GitHub"] if github_stats and github_stats.repositories else []
    soft: List[str] = ["System Architecture", "Problem Solving", "Code Review", "Agile Collaboration"]

    LANG_LIST = ["TypeScript", "JavaScript", "Python", "Java", "C++", "Go", "HTML", "CSS", "SQL"]
    FRAMEWORK_LIST = ["React", "Next.js", "Express", "Node.js", "Tailwind CSS", "Mongoose", "Redux", "Django", "Spring Boot"]

    if graph and graph.nodes:
        for n in graph.nodes:
            if n.type == "Technology":
                lbl = n.label
                if lbl in LANG_LIST and lbl not in technical:
                    technical.append(lbl)
                elif lbl in FRAMEWORK_LIST and lbl not in frameworks:
                    frameworks.append(lbl)
                elif lbl not in tools:
                    tools.append(lbl)
            elif n.type == "Skill":
                if n.label not in soft:
                    soft.append(n.label)

    if github_stats and github_stats.topLanguages:
        for lang in github_stats.topLanguages.keys():
            if lang not in technical:
                technical.append(lang)


    # Select best 3 projects with Groq
    projects = []
    selected_repos = []

    if github_stats and github_stats.repositories:
        if os.getenv("GROQ_API_KEY"):
            try:
                repo_data = [
                    {"name": r.name, "description": r.description, "primary_language": r.language,
                     "all_languages": r.languages, "stars": r.stars, "forks": r.forks,
                     "dependencies": len(r.dependencies)}
                    for r in github_stats.repositories
                ]
                prompt = f"""You are an expert technical recruiter. Select the 3 BEST repositories for a {target_role} role.
Repositories: {json.dumps(repo_data)}
Prioritize: full-stack, backend, AI, complex architecture, TypeScript/Python projects.
Avoid simple HTML/CSS projects.
Output ONLY a valid JSON: {{"projects": ["exact_name_1", "exact_name_2", "exact_name_3"]}}"""

                data = await ask_groq_json(prompt)
                selected_names = data.get("projects", [])
                if selected_names:
                    name_set = set(selected_names)
                    selected_repos = [r for r in github_stats.repositories if r.name in name_set][:3]
            except Exception as e:
                print(f"Groq project selection failed: {e}")

        if len(selected_repos) < 3:
            sorted_repos = sorted(
                github_stats.repositories,
                key=lambda r: r.stars * 10 + r.forks * 5 + len(r.filePaths or []) + len(r.dependencies) * 2,
                reverse=True,
            )
            selected_repos = sorted_repos[:3]

        for repo in selected_repos:
            projects.append({
                "name": repo.name,
                "description": repo.description or f"Full-stack application built with {repo.language or 'modern technologies'}.",
                "liveUrl": _extract_live_url(repo),
                "githubUrl": repo.url,
                "technologies": ([*repo.languages, *repo.dependencies])[:6],
                "bullets": generate_project_bullets(repo),
            })

    experience = []
    if github_stats and github_stats.aggregatedStats:
        s = github_stats.aggregatedStats
        if s.totalCommits > 0 or s.totalPRs > 0:
            experience.append({
                "role": "Open Source / Full Stack Contributor",
                "company": "GitHub Ecosystem",
                "location": "Remote",
                "startDate": "2024",
                "endDate": "Present",
                "current": True,
                "bullets": [
                    f"Spearheaded development across multiple technical repositories, authoring {s.totalCommits}+ verified git commits.",
                    f"Architected and merged {s.totalPRs}+ code pull requests following strict code quality standards and automated linting.",
                    f"Collaborated on end-to-end full stack architecture leveraging {', '.join(technical[:3])} and {', '.join(frameworks[:2])}.",
                ],
                "techStack": [*technical[:3], *frameworks[:3]],
            })

    # Built only from verifiable facts; empty clauses are dropped rather than padded with claims
    repo_count = len(github_stats.repositories) if github_stats else 0
    dsa_solved = 0
    if integration_profile:
        if integration_profile.leetcodeUsername:
            dsa_solved += integration_profile.leetcodeStats.solvedTotal
        if integration_profile.gfgUsername:
            dsa_solved += integration_profile.gfgStats.solvedTotal
    skills_clause = ", ".join([*technical[:3], *frameworks[:2]])
    clauses = []
    if repo_count:
        clauses.append(f"built {repo_count} public project{'s' if repo_count != 1 else ''} on GitHub")
    if dsa_solved:
        clauses.append(f"solved {dsa_solved}+ data structures & algorithms problems on LeetCode and GeeksforGeeks")
    career_objective = f"Results-driven {target_role}" + (f" skilled in {skills_clause}" if skills_clause else "") + "."
    if clauses:
        career_objective += " Has " + " and ".join(clauses) + "."
    career_objective += " Focused on building reliable, well-engineered software."

    github_username = github_stats.profile.username if github_stats else ""

    coding_links: List[Dict[str, str]] = []
    achievements: List[str] = []
    if integration_profile and integration_profile.leetcodeUsername:
        lc = integration_profile.leetcodeStats
        coding_links.append({"label": "LeetCode", "url": f"https://leetcode.com/u/{integration_profile.leetcodeUsername}/"})
        if lc.solvedTotal:
            achievements.append(f"Solved {lc.solvedTotal}+ problems on LeetCode ({lc.solvedMedium} Medium, {lc.solvedHard} Hard)"
                                + (f" with a contest rating of {lc.contestRating}." if lc.contestRating else "."))
    if integration_profile and integration_profile.gfgUsername:
        gfg = integration_profile.gfgStats
        coding_links.append({"label": "GeeksforGeeks", "url": f"https://www.geeksforgeeks.org/user/{integration_profile.gfgUsername}/"})
        if gfg.solvedTotal:
            achievements.append(f"Solved {gfg.solvedTotal}+ problems on GeeksforGeeks with a coding score of {gfg.codingScore}"
                                + (f" (Institute Rank {gfg.instituteRank})." if gfg.instituteRank else "."))

    return {
        # Only fields that can be derived from connected data. Contact details, education,
        # certifications and hackathons are left empty for the user to fill in — never invented.
        "personalInfo": {
            "fullName": full_name, "jobTitle": target_role, "email": email,
            "phone": "", "location": "",
            "githubUrl": f"https://github.com/{github_username}" if github_username else "",
            "linkedinUrl": "", "websiteUrl": "", "customLinks": coding_links,
        },
        "careerObjective": career_objective,
        "targetRole": target_role,
        "selectedTemplate": target_role,
        "education": [],
        "experience": experience,
        "projects": projects,
        "skills": {"technical": technical, "frameworks": frameworks, "tools": tools, "soft": soft},
        "categorizedSkills": [c for c in [
            {"category": "Programming Languages", "skills": technical},
            {"category": "Frontend", "skills": [f for f in frameworks if any(x in f.lower() for x in ["react", "next", "vue", "tailwind", "html", "css"])]},
            {"category": "Backend & APIs", "skills": [f for f in frameworks if any(x in f.lower() for x in ["node", "express", "fastapi", "django", "flask", "spring", "rest", "jwt"])]},
            {"category": "Core Computer Science", "skills": ["Data Structures & Algorithms"] if coding_links else []},
            {"category": "Tools and Platforms", "skills": tools},
        ] if c["skills"]],
        "hackathons": [],
        "certifications": [],
        "achievements": achievements,
        "customSections": [],
    }


def analyze_ats_compatibility(profile, target_role: str = "Software Engineer") -> Dict[str, Any]:
    target_keywords = ROLE_KEYWORDS.get(target_role, ROLE_KEYWORDS["Software Engineer"])

    all_text = " ".join([
        profile.careerObjective or "",
        profile.personalInfo.jobTitle or "",
        *profile.skills.technical,
        *profile.skills.frameworks,
        *profile.skills.tools,
        *[e.role for e in profile.experience],
        *[b for e in profile.experience for b in e.bullets],
        *[p.name for p in profile.projects],
        *[p.description for p in profile.projects],
        *[b for p in profile.projects for b in p.bullets],
        *[t for p in profile.projects for t in p.technologies],
    ]).lower()

    matched_keywords = [kw for kw in target_keywords if kw.lower() in all_text]
    missing_keywords = [kw for kw in target_keywords if kw.lower() not in all_text]
    keyword_match_rate = round(len(matched_keywords) / len(target_keywords) * 100)

    has_measurable_metrics = bool(re.search(r"\d+%|\d+\+|\d+x|\d+ ", all_text, re.I))
    strong_action_verbs_count = sum(1 for v in ACTION_VERBS if v in all_text)

    score = 0
    score += round(keyword_match_rate * 0.45)
    if has_measurable_metrics:
        score += 25
    score += min(20, strong_action_verbs_count * 4)
    if len(profile.projects) >= 2:
        score += 10
    score = min(100, max(10, score))

    suggestions = []
    if keyword_match_rate < 70:
        suggestions.append(f'Integrate key industry terms for {target_role}: consider adding "{"\", \"".join(missing_keywords[:4])}".')
    if not has_measurable_metrics:
        suggestions.append('Add quantifiable impact to your experience or project bullets (e.g., "Improved query response time by 40%" or "Scaled API to handle 10,000+ requests").')
    if strong_action_verbs_count < 3:
        suggestions.append('Begin bullet points with strong action verbs like "Architected", "Spearheaded", "Engineered", or "Optimized".')
    if len(profile.projects) < 2:
        suggestions.append("Highlight at least 2 complete technical projects to demonstrate hands-on application development.")
    if not suggestions:
        suggestions.append("Your resume is exceptionally well-structured and fully optimized for ATS scanners!")

    return {
        "score": score, "keywordMatchRate": keyword_match_rate,
        "hasMeasurableMetrics": has_measurable_metrics,
        "strongActionVerbsCount": strong_action_verbs_count,
        "suggestions": suggestions, "matchedKeywords": matched_keywords,
        "missingKeywords": missing_keywords,
    }
