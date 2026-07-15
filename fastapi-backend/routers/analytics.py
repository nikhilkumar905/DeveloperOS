from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from models.user import User
from models.developer_intelligence import DeveloperIntelligence, DevScores
from models.knowledge_graph import KnowledgeGraph, GraphNode, GraphEdge
from models.github_stats import GithubStats
from models.integration_profile import IntegrationProfile
from services.analytics_engine import calculate_developer_intelligence
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/insights")
async def get_insights(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    intelligence = await DeveloperIntelligence.find_one(DeveloperIntelligence.user == uid)
    now = datetime.utcnow()

    if intelligence and intelligence.lastCalculatedAt and (now - intelligence.lastCalculatedAt) < timedelta(hours=24):
        return intelligence.model_dump(by_alias=True)

    github_stats = await GithubStats.find_one(GithubStats.user == uid)
    integration_profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    data = await calculate_developer_intelligence(github_stats, integration_profile)

    if intelligence:
        intelligence.scores = DevScores(**data.get("scores", {}))
        intelligence.strengths = data.get("strengths", [])
        intelligence.weaknesses = data.get("weaknesses", [])
        intelligence.recommendations = data.get("recommendations", [])
        intelligence.roadmap = data.get("roadmap", [])
        intelligence.lastCalculatedAt = now
        await intelligence.save()
    else:
        intelligence = DeveloperIntelligence(
            user=uid, scores=DevScores(**data.get("scores", {})),
            strengths=data.get("strengths", []), weaknesses=data.get("weaknesses", []),
            recommendations=data.get("recommendations", []), roadmap=data.get("roadmap", []),
            lastCalculatedAt=now,
        )
        await intelligence.insert()
        
    graph = await KnowledgeGraph.find_one(KnowledgeGraph.user == uid)
    kg_data = data.get("knowledge_graph", {})
    nodes = [GraphNode(**n) for n in kg_data.get("nodes", [])]
    edges = []
    for e in kg_data.get("edges", []):
        if "relationship" not in e and "label" in e:
            e["relationship"] = e["label"]
        if "relationship" not in e:
            e["relationship"] = "related"
        edges.append(GraphEdge(**e))
    
    if graph:
        graph.nodes = nodes
        graph.edges = edges
        graph.lastUpdated = now
        await graph.save()
    else:
        graph = KnowledgeGraph(user=uid, nodes=nodes, edges=edges, lastUpdated=now)
        await graph.insert()

    return intelligence.model_dump(by_alias=True)


@router.post("/insights/refresh")
async def refresh_insights(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    github_stats = await GithubStats.find_one(GithubStats.user == uid)
    integration_profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    data = await calculate_developer_intelligence(github_stats, integration_profile)
    now = datetime.utcnow()

    intelligence = await DeveloperIntelligence.find_one(DeveloperIntelligence.user == uid)
    if intelligence:
        intelligence.scores = DevScores(**data.get("scores", {}))
        intelligence.strengths = data.get("strengths", [])
        intelligence.weaknesses = data.get("weaknesses", [])
        intelligence.recommendations = data.get("recommendations", [])
        intelligence.roadmap = data.get("roadmap", [])
        intelligence.lastCalculatedAt = now
        await intelligence.save()
    else:
        intelligence = DeveloperIntelligence(
            user=uid, scores=DevScores(**data.get("scores", {})),
            strengths=data.get("strengths", []), weaknesses=data.get("weaknesses", []),
            recommendations=data.get("recommendations", []), roadmap=data.get("roadmap", []),
            lastCalculatedAt=now,
        )
        await intelligence.insert()
        
    graph = await KnowledgeGraph.find_one(KnowledgeGraph.user == uid)
    kg_data = data.get("knowledge_graph", {})
    nodes = [GraphNode(**n) for n in kg_data.get("nodes", [])]
    edges = []
    for e in kg_data.get("edges", []):
        if "relationship" not in e and "label" in e:
            e["relationship"] = e["label"]
        if "relationship" not in e:
            e["relationship"] = "related"
        edges.append(GraphEdge(**e))
    
    if graph:
        graph.nodes = nodes
        graph.edges = edges
        graph.lastUpdated = now
        await graph.save()
    else:
        graph = KnowledgeGraph(user=uid, nodes=nodes, edges=edges, lastUpdated=now)
        await graph.insert()

    return intelligence.model_dump(by_alias=True)
