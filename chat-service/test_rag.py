import asyncio, requests
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb+srv://developer:nikhil2857@cluster0.hbnaqbi.mongodb.net/personalos?retryWrites=true&w=majority&appName=Cluster0')
    db = client.get_database('personalos')
    user = await db.users.find_one({'email': 'sahnikhil905@gmail.com'})
    print('User ID:', user['_id'])
    
    # Trigger indexing
    res = requests.post('http://localhost:8000/api/index', json={'user_id': str(user['_id'])})
    print('Index Res:', res.json())
    
    # Chat
    res2 = requests.post('http://localhost:8000/api/chat', json={'message': 'what is my strength?'})
    print('Chat Res:', res2.json())

if __name__ == '__main__':
    asyncio.run(main())
