import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { GithubStats } from './src/models/GithubStats';
import User from './src/models/User';

async function checkDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    const user = await User.findOne({ email: 'sahnikhil905@gmail.com' });
    if (!user) return console.log("No user.");
    
    const stats = await GithubStats.findOne({ user: user._id });
    if (stats) {
      const repoData = stats.repositories.map((r: any) => ({
        name: r.name,
        description: r.description,
        language: r.language,
        languages: r.languages,
        stars: r.stars,
        dependencies: r.dependencies?.length || 0
      }));
      console.log(JSON.stringify(repoData.filter(r => ['DeveloperOS', 'Peer-to-peer-learning-platform', 'Crowd-source-Disaster-Management', 'AI_CODE_TRANSLATOR'].includes(r.name)), null, 2));
    }
  } catch(e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}
checkDb();
