import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb+srv://developer:nikhil2857@cluster0.hbnaqbi.mongodb.net/personalos?retryWrites=true&w=majority&appName=Cluster0')
    db = client.get_database('personalos')
    user = await db.users.find_one({'email': 'sahnikhil905@gmail.com'})
    oid = user['_id']
    github_stats = await db.githubstats.find_one({'user': oid})
    intelligence = await db.developerintelligences.find_one({'user': oid})
    resume = await db.resumeprofiles.find_one({'user': oid})
    
    print('resume type:', type(resume))
    if resume:
        for key in ['experience', 'projects', 'skills']:
            val = resume.get(key)
            print(f'{key} type:', type(val))
            if isinstance(val, list) and len(val) > 0:
                print(f'{key}[0] type:', type(val[0]))
                print(f'{key}[0]:', val[0])

if __name__ == '__main__':
    asyncio.run(main())
