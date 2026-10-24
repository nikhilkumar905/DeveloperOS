import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
# Must match the database the FastAPI backend writes to
DB_NAME = os.getenv("MONGO_DB_NAME", "personalos")

client = AsyncIOMotorClient(MONGO_URI)
db = client.get_database(DB_NAME)


async def get_auth_user(user_id: str):
    """Fields needed to validate a token (revocation via tokenVersion, verified email)."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        return None
    return await db["users"].find_one({"_id": oid}, {"tokenVersion": 1, "emailVerified": 1})


async def get_user_data(user_id: str) -> dict:
    oid = ObjectId(user_id)

    user = await db["users"].find_one({"_id": oid}, {"password": 0})
    github_stats = await db["githubstats"].find_one({"user": oid})
    intelligence = await db["developerintelligences"].find_one({"user": oid})
    resume = await db["resumeprofiles"].find_one({"user": oid})
    graph = await db["knowledgegraphs"].find_one({"user": oid})
    integrations = await db["integrationprofiles"].find_one({"user": oid}, {"githubToken": 0})
    sessions = await db["activitysessions"].find({"user": oid}).sort("date", -1).limit(30).to_list(length=30)

    return {
        "user": user,
        "github_stats": github_stats,
        "intelligence": intelligence,
        "resume": resume,
        "knowledge_graph": graph,
        "integrations": integrations,
        "activity_sessions": sessions,
    }
