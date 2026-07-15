import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

import { inferResumeData } from './src/services/resumeIntelligenceEngine';
import { GithubStats } from './src/models/GithubStats';
import User from './src/models/User';
import mongoose from 'mongoose';

async function testEngine() {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    const user = await User.findOne({ email: 'sahnikhil905@gmail.com' });
    const stats = await GithubStats.findOne({ user: user?._id });
    
    if (user && stats) {
      const result = await inferResumeData(user, stats, null, null, null, 'Software Engineer');
      console.log("Result:", result.projects?.map(p => p.name));
    }
  } catch (error: any) {
    console.error("Engine failed:", error);
  } finally {
    mongoose.disconnect();
  }
}
testEngine();
