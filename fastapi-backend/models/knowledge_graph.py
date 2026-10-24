from typing import Optional, List, Dict, Any
from beanie import Document, PydanticObjectId
from pydantic import BaseModel
from datetime import datetime


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    properties: Optional[Dict[str, Any]] = None


class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str
    weight: float = 1.0


class KnowledgeGraph(Document):
    user: PydanticObjectId
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    lastUpdated: Optional[datetime] = None

    class Settings:
        name = "knowledgegraphs"
