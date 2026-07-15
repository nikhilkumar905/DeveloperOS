import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb+srv://developer:nikhil2857@cluster0.hbnaqbi.mongodb.net/personalos?retryWrites=true&w=majority&appName=Cluster0')
    db = client.get_database('personalos')
    user = await db.users.find_one({'email': 'sahnikhil905@gmail.com'})
    oid = user['_id']
    resume = await db.resumeprofiles.find_one({'user': oid})
    
    print('skills:', resume.get('skills'))

if __name__ == '__main__':
    asyncio.run(main())
