from typing import Optional, List, Dict, Any, Tuple
from models.knowledge_graph import GraphNode, GraphEdge

DEP_TO_TECH: Dict[str, str] = {
    "react": "React", "react-dom": "React", "next": "Next.js", "express": "Express",
    "mongoose": "MongoDB", "mongodb": "MongoDB", "typescript": "TypeScript",
    "tailwindcss": "Tailwind CSS", "vue": "Vue.js", "svelte": "Svelte",
    "flask": "Flask", "django": "Django", "fastapi": "FastAPI", "langchain": "LangChain",
    "transformers": "Transformers", "ollama": "Ollama", "jsonwebtoken": "JWT",
    "socket.io": "Socket.io", "redux": "Redux", "firebase": "Firebase", "redis": "Redis",
    "graphql": "GraphQL", "pg": "PostgreSQL", "mysql": "MySQL", "prisma": "Prisma",
    "zustand": "Zustand", "@google/genai": "Gemini", "jest": "Jest",
    "vitest": "Vitest", "cypress": "Cypress", "passport": "OAuth",
}

import re
PATH_TO_TECH = [
    (re.compile(r"(^|\/)Dockerfile$", re.I), "Docker"),
    (re.compile(r"(^|\/)docker-compose\.ya?ml$", re.I), "Docker Compose"),
    (re.compile(r"\.github\/workflows\/.*\.ya?ml$", re.I), "GitHub Actions"),
    (re.compile(r"(^|\/)vercel\.json$", re.I), "Vercel"),
    (re.compile(r"(^|\/)railway\.toml$", re.I), "Railway"),
    (re.compile(r"(^|\/)render\.ya?ml$", re.I), "Render"),
    (re.compile(r"(^|\/)prisma\/schema\.prisma$", re.I), "Prisma"),
    (re.compile(r"(^|\/)((src|server|backend|api)?\/?)?controllers\/", re.I), "MVC Architecture"),
    (re.compile(r"(^|\/)((src|server|backend|api)?\/?)?routes\/", re.I), "REST APIs"),
    (re.compile(r"(^|\/)((src|server|backend|api)?\/?)?middleware\/", re.I), "Middleware"),
    (re.compile(r"(^|\/)kubernetes\/.*\.ya?ml$", re.I), "Kubernetes"),
    (re.compile(r"(^|\/)node_modules\/express\/", re.I), "Express"),
    (re.compile(r"(^|\/)node_modules\/mongoose\/", re.I), "MongoDB"),
    (re.compile(r"(^|\/)node_modules\/react\/", re.I), "React"),
    (re.compile(r"(^|\/)node_modules\/socket\.io\/", re.I), "Socket.io"),
]

TECH_TO_CONCEPT: Dict[str, List[str]] = {
    "React": ["UI Components", "State Management"], "Next.js": ["Server-Side Rendering", "React Framework"],
    "Express": ["REST API", "Web Server"], "MongoDB": ["NoSQL Database"],
    "TypeScript": ["Static Typing"], "Tailwind CSS": ["Utility-First CSS"],
    "Flask": ["REST API", "Web Server"], "Django": ["Web Framework", "ORM"],
    "FastAPI": ["REST API", "Async Programming"], "LangChain": ["LLM Orchestration", "RAG"],
    "Transformers": ["Machine Learning", "NLP"], "Ollama": ["Local LLMs"],
    "Gemini": ["Generative AI", "LLM Integration"], "JWT": ["Authentication"],
    "OAuth": ["Authentication", "Authorization"], "Socket.io": ["Real-time Communication"],
    "Redux": ["State Management"], "Zustand": ["State Management"],
    "Firebase": ["BaaS", "Realtime Database"], "Redis": ["In-Memory Cache"],
    "GraphQL": ["API Query Language"], "Docker": ["Containerization"],
    "Docker Compose": ["Container Orchestration"], "Kubernetes": ["Container Orchestration", "Microservices"],
    "GitHub Actions": ["CI/CD"], "Vercel": ["Serverless Deployment", "PaaS"],
    "Railway": ["PaaS"], "Render": ["PaaS"], "Prisma": ["ORM"],
    "Jest": ["Unit Testing"], "Vitest": ["Unit Testing"], "Cypress": ["End-to-End Testing"],
    "MVC Architecture": ["Design Patterns"], "REST APIs": ["API Design"], "Middleware": ["API Design"],
    "Java": ["Object-Oriented Programming"], "C++": ["Systems Programming"],
    "Python": ["Scripting", "Data Science"], "JavaScript": ["Web Scripting"],
    "Go": ["Systems Programming", "Concurrency"], "PostgreSQL": ["Relational Database"],
    "MySQL": ["Relational Database"],
}

CONCEPT_TO_SKILL: Dict[str, List[str]] = {
    "UI Components": ["Frontend Development"], "State Management": ["Frontend Development"],
    "Server-Side Rendering": ["Frontend Development", "Backend Development"],
    "REST API": ["Backend Development"], "Web Server": ["Backend Development"],
    "NoSQL Database": ["Database Management"], "Static Typing": ["Software Engineering"],
    "Utility-First CSS": ["Frontend Development"], "Web Framework": ["Backend Development"],
    "ORM": ["Backend Development", "Database Management"], "Async Programming": ["Software Engineering"],
    "LLM Orchestration": ["AI/ML Engineering"], "RAG": ["AI/ML Engineering"],
    "Machine Learning": ["AI/ML Engineering"], "NLP": ["AI/ML Engineering"],
    "Local LLMs": ["AI/ML Engineering"], "Generative AI": ["AI/ML Engineering"],
    "LLM Integration": ["AI/ML Engineering"], "Authentication": ["Security"],
    "Authorization": ["Security"], "Real-time Communication": ["Backend Development"],
    "BaaS": ["Cloud Computing"], "Realtime Database": ["Database Management"],
    "In-Memory Cache": ["Backend Development", "DevOps"], "API Query Language": ["Backend Development"],
    "Containerization": ["DevOps", "Cloud Computing"], "Container Orchestration": ["DevOps", "Cloud Computing"],
    "Microservices": ["Software Architecture", "Backend Development"], "CI/CD": ["DevOps"],
    "Serverless Deployment": ["Cloud Computing", "DevOps"], "PaaS": ["Cloud Computing"],
    "Unit Testing": ["Software Engineering", "Quality Assurance"],
    "End-to-End Testing": ["Software Engineering", "Quality Assurance"],
    "Design Patterns": ["Software Architecture"], "API Design": ["Software Architecture", "Backend Development"],
    "Object-Oriented Programming": ["Software Engineering"], "Systems Programming": ["Software Engineering"],
    "Scripting": ["Software Engineering"], "Data Science": ["Data Engineering"],
    "Web Scripting": ["Frontend Development"], "Concurrency": ["Software Engineering", "Backend Development"],
    "Relational Database": ["Database Management"],
}

SKILL_TO_DOMAIN: Dict[str, List[str]] = {
    "Frontend Development": ["Web Development"], "Backend Development": ["Web Development"],
    "Database Management": ["Data Engineering"], "Software Architecture": ["Software Engineering"],
    "Software Engineering": ["Computer Science"], "AI/ML Engineering": ["Artificial Intelligence"],
    "Security": ["Cybersecurity"], "Cloud Computing": ["Cloud Infrastructure"],
    "DevOps": ["Cloud Infrastructure"], "Data Engineering": ["Computer Science"],
    "Quality Assurance": ["Software Engineering"],
}


def build_knowledge_graph(github_stats, integration_profile) -> Dict[str, Any]:
    nodes: Dict[str, GraphNode] = {}
    edges: List[GraphEdge] = []

    def add_node(node: GraphNode):
        if node.id not in nodes:
            nodes[node.id] = node
        else:
            existing = nodes[node.id]
            if node.properties:
                if existing.properties:
                    existing.properties.update(node.properties)
                else:
                    existing.properties = node.properties

    def add_edge(source: str, target: str, relationship: str, weight: float = 1.0):
        for e in edges:
            if e.source == source and e.target == target and e.relationship == relationship:
                e.weight += weight
                return
        edges.append(GraphEdge(source=source, target=target, relationship=relationship, weight=weight))

    USER_ID = "developer:you"
    add_node(GraphNode(id=USER_ID, label="You", type="Developer", properties={"confidence": 100}))

    tech_occurrences: Dict[str, Dict] = {}

    if github_stats and github_stats.repositories:
        for repo in github_stats.repositories:
            repo_id = f"repo:{repo.name}"
            add_node(GraphNode(id=repo_id, label=repo.name, type="Repository",
                               properties={"stars": repo.stars, "forks": repo.forks, "confidence": 100}))
            add_edge(USER_ID, repo_id, "OWNS")

            extracted_techs = set()
            langs = repo.languages if repo.languages else ([repo.language] if repo.language and repo.language != "Unknown" else [])
            extracted_techs.update(langs)

            for dep in repo.dependencies:
                tech = DEP_TO_TECH.get(dep.lower())
                if tech:
                    extracted_techs.add(tech)

            for path in repo.filePaths:
                for pattern, tech in PATH_TO_TECH:
                    if pattern.search(path):
                        extracted_techs.add(tech)

            for tech in extracted_techs:
                if tech not in tech_occurrences:
                    tech_occurrences[tech] = {"count": 0, "repos": set()}
                tech_occurrences[tech]["count"] += 1
                tech_occurrences[tech]["repos"].add(repo.name)

                tech_id = f"tech:{tech}"
                add_node(GraphNode(id=tech_id, label=tech, type="Technology", properties={}))
                add_edge(repo_id, tech_id, "IMPLEMENTS")

                for concept in TECH_TO_CONCEPT.get(tech, []):
                    concept_id = f"concept:{concept}"
                    add_node(GraphNode(id=concept_id, label=concept, type="Concept"))
                    add_edge(tech_id, concept_id, "BELONGS_TO")

                    for skill in CONCEPT_TO_SKILL.get(concept, []):
                        skill_id = f"skill:{skill}"
                        add_node(GraphNode(id=skill_id, label=skill, type="Skill"))
                        add_edge(concept_id, skill_id, "BELONGS_TO")

                        for domain in SKILL_TO_DOMAIN.get(skill, []):
                            domain_id = f"domain:{domain}"
                            add_node(GraphNode(id=domain_id, label=domain, type="Domain"))
                            add_edge(skill_id, domain_id, "BELONGS_TO")

        total_repos = max(1, len(github_stats.repositories))
        for tech, data in tech_occurrences.items():
            tech_id = f"tech:{tech}"
            node = nodes.get(tech_id)
            if node:
                confidence = min(100, round((data["count"] / min(5, total_repos)) * 100))
                repos_list = list(data["repos"])[:3]
                reason = f"Found in {', '.join(repos_list)}"
                if node.properties:
                    node.properties.update({"confidence": confidence, "reason": reason})
                else:
                    node.properties = {"confidence": confidence, "reason": reason}

    def propagate_confidence(child_type: str, parent_type: str, rel: str):
        parent_confidence: Dict[str, Dict] = {}
        for edge in edges:
            if edge.relationship != rel:
                continue
            child = nodes.get(edge.source)
            parent = nodes.get(edge.target)
            if not child or not parent:
                continue
            if child.type != child_type or parent.type != parent_type:
                continue
            conf = (child.properties or {}).get("confidence", 50)
            if parent.id not in parent_confidence:
                parent_confidence[parent.id] = {"total": 0, "count": 0, "repos": set()}
            parent_confidence[parent.id]["total"] += conf
            parent_confidence[parent.id]["count"] += 1

        for parent_id, data in parent_confidence.items():
            parent = nodes.get(parent_id)
            if parent:
                avg_conf = min(100, round(data["total"] / data["count"]) + 15 * (data["count"] - 1))
                if parent.properties:
                    parent.properties["confidence"] = avg_conf
                else:
                    parent.properties = {"confidence": avg_conf}

    propagate_confidence("Technology", "Concept", "BELONGS_TO")
    propagate_confidence("Concept", "Skill", "BELONGS_TO")
    propagate_confidence("Skill", "Domain", "BELONGS_TO")

    for node in nodes.values():
        if node.type in ("Skill", "Domain"):
            if (node.properties or {}).get("confidence", 0) > 30:
                add_edge(USER_ID, node.id, "HAS_SKILL")

    lc = integration_profile.leetcodeStats if integration_profile and integration_profile.leetcodeUsername else None
    gfg = integration_profile.gfgStats if integration_profile and integration_profile.gfgUsername else None

    if lc or gfg:
        dsa_id = "skill:Data Structures & Algorithms"
        domain_id = "domain:Computer Science"
        verified_by = " and ".join(name for name, stats in (("LeetCode", lc), ("GeeksforGeeks", gfg)) if stats)
        add_node(GraphNode(id=dsa_id, label="Data Structures & Algorithms", type="Skill",
                           properties={"confidence": 90, "reason": f"Verified via {verified_by} stats"}))
        add_node(GraphNode(id=domain_id, label="Computer Science", type="Domain",
                           properties={"confidence": 85}))
        add_edge(USER_ID, dsa_id, "HAS_SKILL")
        add_edge(dsa_id, domain_id, "BELONGS_TO")
        add_edge(USER_ID, domain_id, "HAS_SKILL")

        easy = (lc.solvedEasy if lc else 0) + (gfg.solvedSchool + gfg.solvedBasic + gfg.solvedEasy if gfg else 0)
        medium = (lc.solvedMedium if lc else 0) + (gfg.solvedMedium if gfg else 0)
        hard = (lc.solvedHard if lc else 0) + (gfg.solvedHard if gfg else 0)
        if easy > 0:
            add_node(GraphNode(id="topic:Basic Algorithms", label="Basic Algorithms", type="Topic",
                               properties={"confidence": 100, "solved": easy}))
            add_edge(dsa_id, "topic:Basic Algorithms", "IMPROVES")
        if medium > 0:
            add_node(GraphNode(id="topic:Intermediate Algorithms", label="Intermediate Algorithms", type="Topic",
                               properties={"confidence": 80, "solved": medium}))
            add_edge(dsa_id, "topic:Intermediate Algorithms", "IMPROVES")
        if hard > 0:
            add_node(GraphNode(id="topic:Advanced Algorithms", label="Advanced Algorithms", type="Topic",
                               properties={"confidence": 70, "solved": hard}))
            add_edge(dsa_id, "topic:Advanced Algorithms", "IMPROVES")
        if lc and lc.badges > 0:
            add_node(GraphNode(id="achievement:LeetCode Badges", label="LeetCode Badges", type="Achievement",
                               properties={"confidence": 100}))
            add_edge("achievement:LeetCode Badges", dsa_id, "RELATED_TO")
        if gfg and gfg.codingScore > 0:
            add_node(GraphNode(id="achievement:GeeksforGeeks Coding Score", label=f"GFG Coding Score {gfg.codingScore}",
                               type="Achievement", properties={"confidence": 100}))
            add_edge("achievement:GeeksforGeeks Coding Score", dsa_id, "RELATED_TO")

    return {"nodes": list(nodes.values()), "edges": edges}


def get_graph_based_recommendations(nodes: List[GraphNode], edges: List[GraphEdge]) -> List[str]:
    recommendations = set()
    known_tech_ids = [n.id for n in nodes if n.type == "Technology" and (n.properties or {}).get("confidence", 0) > 30]
    known_skill_ids = [n.id for n in nodes if n.type == "Skill" and (n.properties or {}).get("confidence", 0) > 30]

    def knows(tech: str) -> bool:
        return f"tech:{tech}" in known_tech_ids

    if not known_tech_ids:
        return ["Connect GitHub repositories and push architectural code to get recommendations."]

    if knows("React") and knows("Express") and knows("MongoDB") and knows("REST APIs"):
        if not knows("Redis"):
            recommendations.add("You have mastered the MERN stack! Next, learn Redis for performance optimization and caching.")
        if not knows("GraphQL"):
            recommendations.add("Consider moving beyond REST APIs by learning GraphQL for more efficient data querying.")
        if not knows("Docker"):
            recommendations.add("Your full-stack architecture is solid. Learn Docker to containerize your applications.")

    if knows("Docker") and not knows("Kubernetes") and not knows("Docker Compose"):
        recommendations.add("Since you know Docker, explore Kubernetes or Docker Compose to orchestrate microservices.")

    if knows("React") and not knows("Zustand") and not knows("Redux"):
        recommendations.add("Level up your React architecture by implementing advanced state management with Zustand or Redux.")

    if knows("Express") and knows("MongoDB") and not knows("Prisma"):
        recommendations.add("Improve your database access layer by adopting an ORM like Prisma.")

    if (knows("React") or knows("Express")) and not knows("GitHub Actions"):
        recommendations.add("Automate your deployment pipeline by learning GitHub Actions or other CI/CD tools.")

    if knows("Python") and knows("FastAPI") and not knows("LangChain") and not knows("Ollama"):
        recommendations.add("Your Python backend skills are great. Explore LangChain or Ollama to integrate Generative AI capabilities.")

    if not recommendations:
        recommendations.add("Your architectural graph is highly advanced! Consider exploring System Design, Microservices, or deep AI integrations.")

    return list(recommendations)[:3]
