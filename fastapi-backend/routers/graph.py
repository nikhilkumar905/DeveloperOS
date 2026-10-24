from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from models.user import User
from models.knowledge_graph import KnowledgeGraph
from models.github_stats import GithubStats
from models.integration_profile import IntegrationProfile
from routers.analytics import rebuild_knowledge_graph, CACHE_TTL
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("")
async def get_graph(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    graph = await KnowledgeGraph.find_one(KnowledgeGraph.user == uid)
    if graph and graph.lastUpdated and (datetime.utcnow() - graph.lastUpdated) < CACHE_TTL:
        return graph.model_dump(by_alias=True)

    github_stats = await GithubStats.find_one(GithubStats.user == uid)
    integration_profile = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    graph = await rebuild_knowledge_graph(uid, github_stats, integration_profile)
    return graph.model_dump(by_alias=True)
