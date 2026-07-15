from langchain_core.documents import Document

def prepare_documents(data: dict) -> list[Document]:
    docs = []
    
    # 1. Developer Intelligence (Strengths, Weaknesses, etc.)
    intel = data.get("intelligence")
    if intel:
        if intel.get("strengths"):
            text = f"My strengths as a developer are: {', '.join(intel['strengths'])}"
            docs.append(Document(page_content=text, metadata={"source": "developer_intelligence", "type": "strength"}))
        if intel.get("weaknesses"):
            text = f"My weaknesses or areas of improvement are: {', '.join(intel['weaknesses'])}"
            docs.append(Document(page_content=text, metadata={"source": "developer_intelligence", "type": "weakness"}))
        if intel.get("recommendations"):
            text = f"Recommendations for my growth: {', '.join(intel['recommendations'])}"
            docs.append(Document(page_content=text, metadata={"source": "developer_intelligence", "type": "recommendation"}))
        if intel.get("scores"):
            scores = intel["scores"]
            text = f"My technical scores are: DSA={scores.get('dsa', 0)}, Frontend={scores.get('frontend', 0)}, Backend={scores.get('backend', 0)}, FullStack={scores.get('fullStack', 0)}, Overall={scores.get('overallScore', 0)}"
            docs.append(Document(page_content=text, metadata={"source": "developer_intelligence", "type": "score"}))

    # 2. Github Stats
    gh = data.get("github_stats")
    if gh and gh.get("repositories"):
        for repo in gh["repositories"]:
            desc = repo.get("description", "No description")
            langs = ", ".join(repo.get("languages", []))
            deps = ", ".join(repo.get("dependencies", []))
            file_paths = ", ".join(repo.get("filePaths", []))
            text = f"Repository name: {repo.get('name')}. Description: {desc}. Primary Language: {repo.get('language')}. All Languages used: {langs}. Dependencies and libraries used: {deps}. Structural files available in the repository (e.g. package.json, requirements.txt, README.md): {file_paths}. Stars: {repo.get('stars')}. URL: {repo.get('url')}"
            docs.append(Document(page_content=text, metadata={"source": "github", "type": "repository", "name": repo.get("name")}))

    # 3. Resume Profile
    resume = data.get("resume")
    if resume:
        # Experience
        for exp in resume.get("experience", []):
            text = f"Work Experience: {exp.get('role')} at {exp.get('company')}. Duration: {exp.get('startDate')} to {exp.get('endDate')}. Description: {exp.get('description')}. Technologies used: {', '.join(exp.get('technologies', []))}"
            docs.append(Document(page_content=text, metadata={"source": "resume", "type": "experience", "company": exp.get('company')}))
        # Projects
        for proj in resume.get("projects", []):
            text = f"Project name: {proj.get('name')}. Description: {proj.get('description')}. Technologies used: {', '.join(proj.get('technologies', []))}"
            docs.append(Document(page_content=text, metadata={"source": "resume", "type": "project", "name": proj.get("name")}))
        # Skills
        skills_data = resume.get("skills", {})
        if isinstance(skills_data, dict):
            for category, items in skills_data.items():
                if isinstance(items, list):
                    text = f"I am skilled in {category}: {', '.join(items)}"
                    docs.append(Document(page_content=text, metadata={"source": "resume", "type": "skill"}))
        elif isinstance(skills_data, list):
            for skill in skills_data:
                text = f"I am skilled in {skill.get('category')}: {', '.join(skill.get('items', []))}"
                docs.append(Document(page_content=text, metadata={"source": "resume", "type": "skill"}))

    # 4. Knowledge Graph
    kg = data.get("knowledge_graph")
    if kg:
        nodes = kg.get("nodes", [])
        if nodes:
            techs = [n.get("label") for n in nodes if n.get("type") == "Technology"]
            skills = [n.get("label") for n in nodes if n.get("type") == "Skill"]
            if techs:
                docs.append(Document(page_content=f"My primary technologies and frameworks are: {', '.join(techs)}", metadata={"source": "knowledge_graph", "type": "technology"}))
            if skills:
                docs.append(Document(page_content=f"My high-level skills and concepts are: {', '.join(skills)}", metadata={"source": "knowledge_graph", "type": "skill"}))

    return docs
