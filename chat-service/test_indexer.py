import asyncio
from database import get_user_data
from indexer import prepare_documents
from rag_engine import ingest_documents

async def main():
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient('mongodb+srv://developer:nikhil2857@cluster0.hbnaqbi.mongodb.net/personalos?retryWrites=true&w=majority&appName=Cluster0')
        db = client.get_database('personalos')
        user = await db.users.find_one({'email': 'sahnikhil905@gmail.com'})
        
        user_id = str(user['_id'])
        print(f"Testing with user_id: {user_id}")
        
        data = await get_user_data(user_id)
        print("Data fetched successfully. Preparing documents...")
        
        docs = prepare_documents(data)
        print(f"Prepared {len(docs)} documents. Ingesting...")
        
        ingest_documents(docs)
        print("Ingestion successful.")
        
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
