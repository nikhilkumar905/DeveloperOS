import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { inferResumeData } from './src/services/resumeIntelligenceEngine';
import GithubStats from './src/models/GithubStats';
import IntegrationProfile from './src/models/IntegrationProfile';
import DeveloperIntelligence from './src/models/DeveloperIntelligence';
import KnowledgeGraph from './src/models/KnowledgeGraph';
import User from './src/models/User';

async function debugGroqInference() {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log("Connected to MongoDB.");

    const user = await User.findOne();
    if (!user) {
      console.log("No user found.");
      return;
    }
    const userId = user._id;
    console.log("Testing inference for user:", user.email);

    const githubStats = await GithubStats.findOne({ user: userId });
    const integrationProfile = await IntegrationProfile.findOne({ user: userId });
    const intelligence = await DeveloperIntelligence.findOne({ user: userId });
    const graph = await KnowledgeGraph.findOne({ user: userId });

    console.log("GROQ_API_KEY from process.env:", process.env.GROQ_API_KEY ? "EXISTS" : "MISSING");

    const inferred = await inferResumeData(user, githubStats, integrationProfile, intelligence, graph, 'Software Engineer');

    console.log("Inferred Projects:", inferred.projects?.map(p => p.name));

  } catch (error) {
    console.error("Debug Error:", error);
  } finally {
    mongoose.connection.close();
  }
}

debugGroqInference();
