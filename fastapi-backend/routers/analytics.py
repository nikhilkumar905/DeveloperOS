from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from models.user import User
from models.developer_intelligence import DeveloperIntelligence, DevScores
from models.knowledge_graph import KnowledgeGraph, GraphNode, GraphEdge
from models.github_stats import GithubStats
from models.integration_profile import IntegrationProfile
from services.analytics_engine import calculate_developer_intelligence
from services.knowledge_graph_engine import build_knowledge_graph
from middleware.auth import get_current_user
from middleware.rate_limit import limiter, LLM_LIMITS
from fastapi import Request

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

CACHE_TTL = timedelta(hours=24)


async def invalidate_insights(uid) -> None:
    """Drop cached insights + graph so they are rebuilt from the latest platform data on next view."""
    await DeveloperIntelligence.find_one(DeveloperIntelligence.user == uid).delete()
    await KnowledgeGraph.find_one(KnowledgeGraph.user == uid).delete()


async def rebuild_knowledge_graph(uid, github_stats, integration_profile) -> KnowledgeGraph:
    """Recompute the user's knowledge graph from GitHub + coding-platform data and persist it."""
    kg_data = build_knowledge_graph(github_stats, integration_profile)
    nodes = [n if isinstance(n, GraphNode) else GraphNode(**n) for n in kg_data.get("nodes", [])]
    edges = []
    for e in kg_data.get("edges", []):
        if isinstance(e, GraphEdge):
            edges.append(e)
            continue
        e.setdefault("relationship", e.get("label", "related"))
        edges.append(GraphEdge(**e))

    now = datetime.utcnow()
    graph = await KnowledgeGraph.find_one(KnowledgeGraph.user == uid)
    if graph:
        graph.nodes, graph.edges, graph.lastUpdated = nodes, edges, now
        await graph.save()
    else:
        graph = KnowledgeGraph(user=uid, nodes=nodes, edges=edges, lastUpdated=now)
        await graph.insert()
    return graph


async def _recompute_insights(uid) -> DeveloperIntelligence:
    github_stats = await GithubStats.find_one(GithubStats.user == uid)
    integration_profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    data = await calculate_developer_intelligence(github_stats, integration_profile)
    now = datetime.utcnow()

    fields = dict(
        scores=DevScores(**data.get("scores", {})),
        strengths=data.get("strengths", []),
        weaknesses=data.get("weaknesses", []),
        recommendations=data.get("recommendations", []),
        roadmap=data.get("roadmap", []),
        lastCalculatedAt=now,
    )
    intelligence = await DeveloperIntelligence.find_one(DeveloperIntelligence.user == uid)
    if intelligence:
        for key, value in fields.items():
            setattr(intelligence, key, value)
        await intelligence.save()
    else:
        intelligence = DeveloperIntelligence(user=uid, **fields)
        await intelligence.insert()

    await rebuild_knowledge_graph(uid, github_stats, integration_profile)
    return intelligence


@router.get("/insights")
async def get_insights(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    intelligence = await DeveloperIntelligence.find_one(DeveloperIntelligence.user == uid)
    if intelligence and intelligence.lastCalculatedAt and (datetime.utcnow() - intelligence.lastCalculatedAt) < CACHE_TTL:
        return intelligence.model_dump(by_alias=True)
    return (await _recompute_insights(uid)).model_dump(by_alias=True)


@router.post("/insights/refresh")
@limiter.limit(LLM_LIMITS["insights_refresh"])
async def refresh_insights(request: Request, current_user: User = Depends(get_current_user)):
    return (await _recompute_insights(current_user.id)).model_dump(by_alias=True)
