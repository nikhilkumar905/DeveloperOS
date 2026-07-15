import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
# If MONGO_URI contains the DB name (e.g. .../developer_os?retryWrites=true)
# We can extract it or default to developer_os
DB_NAME = "personalos"

client = AsyncIOMotorClient(MONGO_URI)
db = client.get_database(DB_NAME)

async def get_user_data(user_id: str):
    from bson import ObjectId
    oid = ObjectId(user_id)
    
    user = await db["users"].find_one({"_id": oid})
    github_stats = await db["githubstats"].find_one({"user": oid})
    intelligence = await db["developerintelligences"].find_one({"user": oid})
    resume = await db["resumeprofiles"].find_one({"user": oid})
    graph = await db["knowledgegraphs"].find_one({"user": oid})
    
    return {
        "user": user,
        "github_stats": github_stats,
        "intelligence": intelligence,
        "resume": resume,
        "knowledge_graph": graph
    }
