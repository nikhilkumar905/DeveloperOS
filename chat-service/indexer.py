from langchain_core.documents import Document

# Files worth mentioning to the LLM; a raw dump of every path is mostly noise.
STRUCTURAL_FILES = (
    "package.json", "requirements.txt", "pyproject.toml", "readme.md", "dockerfile", "docker-compose.yml",
    "docker-compose.yaml", "pom.xml", "build.gradle", "go.mod", "cargo.toml", "tsconfig.json",
    "vite.config.ts", "next.config.js", ".github/workflows",
)


def _join(items, limit: int = None) -> str:
    values = [str(i) for i in (items or []) if i]
    if limit is not None:
        values = values[:limit]
    return ", ".join(values)


def _doc(text: str, source: str, type_: str, name: str = "") -> Document:
    # Chroma metadata must be scalar and non-null
    return Document(page_content=text.strip(), metadata={"source": source, "type": type_, "name": name or ""})


def _structural_files(paths) -> str:
    hits = [p for p in (paths or []) if any(marker in p.lower() for marker in STRUCTURAL_FILES)]
    return _join(hits, 15)


CATALOG_MAX_REPOS = 40


def _repository_catalog(repos: list) -> str:
    """One line per repository, most starred first.

    Questions like "which repos use React?", "which have CI?" or "what's my most starred project?"
    need every repository at once, which top-k retrieval over per-repo documents can't guarantee.
    """
    if not repos:
        return ""
    ordered = sorted(repos, key=lambda r: (-(r.get("stars") or 0), (r.get("name") or "").lower()))
    lines = []
    for repo in ordered[:CATALOG_MAX_REPOS]:
        paths = [p.lower() for p in repo.get("filePaths") or []]
        has_ci = any(".github/workflows" in p for p in paths)
        has_docker = any(p.endswith("dockerfile") or "docker-compose" in p for p in paths)
        # Every field is stated for every repo (including "no"/"none"): models filter lists far more
        # reliably on explicit values than on the absence of a mention.
        lines.append(
            f"- {repo.get('name')} | primary language: {repo.get('language') or 'unknown'}"
            f" | all languages: {_join(repo.get('languages')) or 'unknown'}"
            f" | libraries: {_join(repo.get('dependencies'), 12) or 'none detected'}"
            f" | stars: {repo.get('stars', 0)}"
            f" | GitHub Actions CI/CD: {'yes' if has_ci else 'no'}"
            f" | Docker: {'yes' if has_docker else 'no'}"
            f" | live demo: {repo.get('homepage') or 'none'}"
        )
    more = len(ordered) - CATALOG_MAX_REPOS
    header = f"Catalog of all {len(repos)} GitHub repositories, sorted by stars (most starred first):"
    return header + "\n" + "\n".join(lines) + (f"\n- ...and {more} more repositories with fewer stars." if more > 0 else "")


def prepare_documents(data: dict) -> list[Document]:
    docs: list[Document] = []
    user = data.get("user") or {}
    gh = data.get("github_stats") or {}
    intel = data.get("intelligence") or {}
    resume = data.get("resume") or {}
    integrations = data.get("integrations") or {}

    lc_user = integrations.get("leetcodeUsername") or ""
    lc = integrations.get("leetcodeStats") or {}
    gfg_user = integrations.get("gfgUsername") or ""
    gfg = integrations.get("gfgStats") or {}

    # 0. Overview: always added to the context so broad questions ("summarize my profile") work
    gh_profile = gh.get("profile") or {}
    agg = gh.get("aggregatedStats") or {}
    top_langs = sorted((gh.get("topLanguages") or {}).items(), key=lambda kv: kv[1], reverse=True)
    platforms = [p for p, connected in (("GitHub", gh_profile.get("username")), ("LeetCode", lc_user), ("GeeksforGeeks", gfg_user)) if connected]
    scores = intel.get("scores") or {}
    overview = [f"Developer profile overview for {user.get('name') or 'the developer'}."]
    if platforms:
        overview.append(f"Connected platforms: {', '.join(platforms)}.")
    if gh_profile.get("username"):
        overview.append(
            f"GitHub username {gh_profile['username']} with {len(gh.get('repositories') or [])} repositories, "
            f"{agg.get('totalCommits', 0)} commits, {agg.get('totalPRs', 0)} pull requests, {agg.get('totalStars', 0)} stars "
            f"and {gh_profile.get('followers', 0)} followers."
        )
    if top_langs:
        overview.append(f"Top programming languages by code volume: {_join([lang for lang, _ in top_langs], 8)}.")
    if lc_user:
        overview.append(f"LeetCode: {lc.get('solvedTotal', 0)} problems solved.")
    if gfg_user:
        overview.append(f"GeeksforGeeks: {gfg.get('solvedTotal', 0)} problems solved, coding score {gfg.get('codingScore', 0)}.")
    if scores:
        overview.append(f"Overall developer score: {scores.get('overallScore', 0)}/100.")
    docs.append(_doc(" ".join(overview), "profile", "overview", "overview"))

    # 1. Developer Intelligence
    if intel.get("strengths"):
        docs.append(_doc(f"My strengths as a developer are: {_join(intel['strengths'])}", "developer_intelligence", "strength"))
    if intel.get("weaknesses"):
        docs.append(_doc(f"My weaknesses or areas of improvement are: {_join(intel['weaknesses'])}", "developer_intelligence", "weakness"))
    if intel.get("recommendations"):
        docs.append(_doc(f"Recommendations for my growth: {_join(intel['recommendations'])}", "developer_intelligence", "recommendation"))
    if intel.get("roadmap"):
        docs.append(_doc(f"My learning roadmap / next steps: {_join(intel['roadmap'])}", "developer_intelligence", "roadmap"))
    if scores:
        score_text = ", ".join(f"{k}={v}" for k, v in scores.items() if v is not None)
        docs.append(_doc(f"My technical skill scores out of 100 are: {score_text}", "developer_intelligence", "score"))

    # 2. Coding platforms
    if lc_user:
        recent = _join([a.get("title") for a in lc.get("recentActivity") or []], 5)
        docs.append(_doc(
            f"LeetCode profile ({lc_user}): solved {lc.get('solvedTotal', 0)} problems — Easy {lc.get('solvedEasy', 0)}, "
            f"Medium {lc.get('solvedMedium', 0)}, Hard {lc.get('solvedHard', 0)}. Contest rating {lc.get('contestRating', 0)}, "
            f"{lc.get('badges', 0)} badges, {lc.get('submissions', 0)} accepted submissions. "
            f"Recently solved: {recent or 'none recorded'}.",
            "leetcode", "coding_platform", "leetcode",
        ))
    if gfg_user:
        recent = _join([f"{a.get('title')} ({a.get('difficulty')})" for a in gfg.get("recentActivity") or []], 5)
        langs = _join([f"{lang} ({n})" for lang, n in (gfg.get("languages") or {}).items()])
        docs.append(_doc(
            f"GeeksforGeeks profile ({gfg_user}): solved {gfg.get('solvedTotal', 0)} problems — School {gfg.get('solvedSchool', 0)}, "
            f"Basic {gfg.get('solvedBasic', 0)}, Easy {gfg.get('solvedEasy', 0)}, Medium {gfg.get('solvedMedium', 0)}, "
            f"Hard {gfg.get('solvedHard', 0)}. Coding score {gfg.get('codingScore', 0)}, monthly score {gfg.get('monthlyScore', 0)}, "
            f"current problem-of-the-day streak {gfg.get('currentStreak', 0)} days (longest {gfg.get('longestStreak', 0)}). "
            f"Institute: {gfg.get('instituteName') or 'not set'}{', rank ' + gfg['instituteRank'] if gfg.get('instituteRank') else ''}. "
            f"Languages used on GFG: {langs or 'unknown'}. Recently solved: {recent or 'none recorded'}.",
            "geeksforgeeks", "coding_platform", "geeksforgeeks",
        ))

    # 3. Recent activity tracked by the browser extension
    sessions = data.get("activity_sessions") or []
    if sessions:
        total_hours = sum(s.get("totalTimeMs", 0) for s in sessions) / 3_600_000
        solved = sum(s.get("problemsSolved", 0) for s in sessions)
        streak = sessions[0].get("streak", 0)
        platforms_used = sorted({p for s in sessions for p in s.get("activePlatforms") or []})
        docs.append(_doc(
            f"My recent coding activity over the last {len(sessions)} active days: {total_hours:.1f} hours tracked, "
            f"{solved} problems solved, current streak {streak} days, platforms used: {_join(platforms_used) or 'none'}. "
            f"Most recent active day: {sessions[0].get('date')}.",
            "activity", "activity_summary", "activity",
        ))

    # 4. GitHub repositories
    catalog = _repository_catalog(gh.get("repositories") or [])
    if catalog:
        docs.append(_doc(catalog, "github", "repo_catalog", "catalog"))
    for repo in gh.get("repositories") or []:
        name = repo.get("name") or "Unknown"
        text = (
            f"Repository name: {name}. Description: {repo.get('description') or 'No description'}. "
            f"Primary Language: {repo.get('language')}. All Languages used: {_join(repo.get('languages'))}. "
            f"Dependencies and libraries used: {_join(repo.get('dependencies'), 40)}. "
            f"Key project files: {_structural_files(repo.get('filePaths')) or 'not available'}. "
            f"Stars: {repo.get('stars', 0)}, Forks: {repo.get('forks', 0)}. URL: {repo.get('url')}"
            + (f". Live demo: {repo['homepage']}" if repo.get("homepage") else "")
        )
        docs.append(_doc(text, "github", "repository", name))

    # 5. Resume Profile
    info = resume.get("personalInfo") or {}
    if resume:
        links = _join([f"{l.get('label')}: {l.get('url')}" for l in info.get("customLinks") or []])
        docs.append(_doc(
            f"Resume headline: {info.get('fullName') or user.get('name')} — {info.get('jobTitle') or resume.get('targetRole')}. "
            f"Target role: {resume.get('targetRole')}. Career objective: {resume.get('careerObjective') or 'not set'}. "
            f"Location: {info.get('location') or 'not set'}. Links: {_join([info.get('githubUrl'), info.get('linkedinUrl'), info.get('websiteUrl')])}"
            + (f", {links}" if links else "") + f". ATS score: {resume.get('atsScore', 0)}/100.",
            "resume", "summary", "resume",
        ))
    for edu in resume.get("education") or []:
        docs.append(_doc(
            f"Education: {edu.get('degree')} in {edu.get('fieldOfStudy')} at {edu.get('institution')} "
            f"({edu.get('startYear')}–{edu.get('endYear')}), GPA {edu.get('gpa') or 'n/a'}. {' '.join(edu.get('highlights') or [])}",
            "resume", "education", edu.get("institution") or "",
        ))
    for exp in resume.get("experience") or []:
        end = "Present" if exp.get("current") else exp.get("endDate")
        docs.append(_doc(
            f"Work Experience: {exp.get('role')} at {exp.get('company')} ({exp.get('location') or 'n/a'}), "
            f"{exp.get('startDate')} to {end}. Highlights: {' '.join(exp.get('bullets') or [])} "
            f"Technologies used: {_join(exp.get('techStack'))}",
            "resume", "experience", exp.get("company") or "",
        ))
    for proj in resume.get("projects") or []:
        docs.append(_doc(
            f"Project name: {proj.get('name')}. Description: {proj.get('description')}. "
            f"Highlights: {' '.join(proj.get('bullets') or [])} Technologies used: {_join(proj.get('technologies'))}. "
            f"GitHub: {proj.get('githubUrl') or 'n/a'}. Live: {proj.get('liveUrl') or 'n/a'}",
            "resume", "project", proj.get("name") or "",
        ))
    skills_data = resume.get("skills") or {}
    if isinstance(skills_data, dict):
        parts = [f"{category}: {_join(items)}" for category, items in skills_data.items() if isinstance(items, list) and items]
        if parts:
            docs.append(_doc(f"My resume skills — {'; '.join(parts)}", "resume", "skill"))
    categorized = [f"{c.get('category')}: {_join(c.get('skills'))}" for c in resume.get("categorizedSkills") or [] if c.get("skills")]
    if categorized:
        docs.append(_doc(f"My skills by category — {'; '.join(categorized)}", "resume", "skill"))
    certs = [f"{c.get('name')} ({c.get('issuer')})" for c in resume.get("certifications") or [] if c.get("name")]
    if certs:
        docs.append(_doc(f"My certifications: {_join(certs)}", "resume", "certification"))
    hackathons = [f"{h.get('name')}: {h.get('achievement')} ({h.get('date')})" for h in resume.get("hackathons") or [] if h.get("name")]
    if hackathons:
        docs.append(_doc(f"Hackathons I participated in: {'; '.join(hackathons)}", "resume", "hackathon"))
    if resume.get("achievements"):
        docs.append(_doc(f"My achievements: {' '.join(resume['achievements'])}", "resume", "achievement"))

    # 6. Knowledge Graph Connections
    kg = data.get("knowledge_graph")
    if kg:
        nodes = kg.get("nodes", [])
        edges = kg.get("edges", [])
        node_map = {n.get("id"): n for n in nodes}

        # IMPLEMENTS edges: Repo -> Technology
        repo_techs = {}
        for edge in edges:
            if edge.get("relationship") == "IMPLEMENTS":
                src, tgt = edge.get("source"), edge.get("target")
                if src and tgt and src.startswith("repo:") and tgt.startswith("tech:"):
                    repo_techs.setdefault(src, set()).add(tgt)

        # BELONGS_TO edges: Technology -> Concept and Concept -> Skill
        tech_concepts, concept_skills = {}, {}
        for edge in edges:
            if edge.get("relationship") == "BELONGS_TO":
                src, tgt = edge.get("source"), edge.get("target")
                if src and tgt:
                    if src.startswith("tech:") and tgt.startswith("concept:"):
                        tech_concepts.setdefault(src, set()).add(tgt)
                    elif src.startswith("concept:") and tgt.startswith("skill:"):
                        concept_skills.setdefault(src, set()).add(tgt)

        for repo_id, tech_ids in repo_techs.items():
            repo_node = node_map.get(repo_id)
            if not repo_node:
                continue
            repo_name = repo_node.get("label", "Unknown Repo")
            repo_technologies, repo_skills = [], set()
            for tech_id in tech_ids:
                tech_node = node_map.get(tech_id)
                if tech_node:
                    repo_technologies.append(tech_node.get("label"))
                for concept_id in tech_concepts.get(tech_id, []):
                    for skill_id in concept_skills.get(concept_id, []):
                        skill_node = node_map.get(skill_id)
                        if skill_node:
                            repo_skills.add(skill_node.get("label"))
            if repo_technologies:
                text = (
                    f"Knowledge Graph for Repository '{repo_name}': It implements exact technologies, frameworks, and databases "
                    f"including {_join(repo_technologies)}. These technologies demonstrate that this repository uses skills in: "
                    f"{_join(repo_skills) or 'Software Engineering'}."
                )
                docs.append(_doc(text, "knowledge_graph_relationships", "repo_tech_skills", repo_name))

        techs = [n.get("label") for n in nodes if n.get("type") == "Technology"]
        skills = [n.get("label") for n in nodes if n.get("type") == "Skill"]
        if techs:
            docs.append(_doc(f"My primary overall technologies, databases, and frameworks are: {_join(techs)}", "knowledge_graph", "technology"))
        if skills:
            docs.append(_doc(f"My overall high-level skills and concepts are: {_join(skills)}", "knowledge_graph", "skill"))

    return docs
