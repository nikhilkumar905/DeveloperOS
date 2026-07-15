from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from models.user import User
from models.knowledge_graph import KnowledgeGraph, GraphNode, GraphEdge
from models.github_stats import GithubStats
from models.integration_profile import IntegrationProfile
from services.analytics_engine import calculate_developer_intelligence
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("")
async def get_graph(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    graph = await KnowledgeGraph.find_one(KnowledgeGraph.user == uid)
    now = datetime.utcnow()

    if graph and graph.lastUpdated and (now - graph.lastUpdated) < timedelta(hours=24):
        return graph.model_dump(by_alias=True)

    github_stats = await GithubStats.find_one(GithubStats.user == uid)
    integration_profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    data = await calculate_developer_intelligence(github_stats, integration_profile)
    kg_data = data.get("knowledge_graph", {"nodes": [], "edges": []})

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

    return graph.model_dump(by_alias=True)
