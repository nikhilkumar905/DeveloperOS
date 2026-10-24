import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "personalos")


async def init_db():
    """Initialize the MongoDB connection and Beanie ODM."""
    client = AsyncIOMotorClient(MONGO_URI)
    
    # Import all models here to avoid circular imports
    from models.user import User
    from models.integration_profile import IntegrationProfile
    from models.github_stats import GithubStats
    from models.developer_intelligence import DeveloperIntelligence
    from models.knowledge_graph import KnowledgeGraph
    from models.resume_profile import ResumeProfile
    from models.goal import Goal
    from models.notification import Notification
    from models.timeline_event import TimelineEvent
    from models.activity_log import ActivityLog
    from models.activity_session import ActivitySession
    from models.portfolio_settings import PortfolioSettings
    from models.generated_document import GeneratedDocument
    from models.auth_tokens import EmailOtp, RefreshToken

    await init_beanie(
        database=client.get_database(MONGO_DB_NAME),
        document_models=[
            User,
            IntegrationProfile,
            GithubStats,
            DeveloperIntelligence,
            KnowledgeGraph,
            ResumeProfile,
            Goal,
            Notification,
            TimelineEvent,
            ActivityLog,
            ActivitySession,
            PortfolioSettings,
            GeneratedDocument,
            EmailOtp,
            RefreshToken,
        ],
    )
    print("[database] MongoDB connected and Beanie initialized.")
