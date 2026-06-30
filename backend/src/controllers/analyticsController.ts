import { Request, Response } from 'express';
import DeveloperIntelligence from '../models/DeveloperIntelligence';
import { GithubStats } from '../models/GithubStats';
import IntegrationProfile from '../models/IntegrationProfile';
import { calculateDeveloperIntelligence } from '../services/analyticsEngine';

// @desc    Get Developer Intelligence Insights
// @route   GET /api/analytics/insights
// @access  Private
export const getInsights = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;

    // Fetch existing insights to check if we can return a cached version (e.g., within the last 24h)
    let intelligence = await DeveloperIntelligence.findOne({ user: userId });

    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const now = new Date();

    if (
      intelligence &&
      intelligence.lastCalculatedAt &&
      (now.getTime() - intelligence.lastCalculatedAt.getTime()) < TWENTY_FOUR_HOURS
    ) {
      // Return cached analytics
      return res.json(intelligence);
    }

    // Need to calculate new insights
    const githubStats = await GithubStats.findOne({ user: userId });
    const integrationProfile = await IntegrationProfile.findOne({ user: userId });

    const calculatedData = calculateDeveloperIntelligence(githubStats, integrationProfile);

    if (intelligence) {
      // Update existing
      intelligence.scores = calculatedData.scores;
      intelligence.strengths = calculatedData.strengths;
      intelligence.weaknesses = calculatedData.weaknesses;
      intelligence.recommendations = calculatedData.recommendations;
      intelligence.roadmap = calculatedData.roadmap;
      intelligence.lastCalculatedAt = now;
      await intelligence.save();
    } else {
      // Create new
      intelligence = await DeveloperIntelligence.create({
        user: userId,
        ...calculatedData,
        lastCalculatedAt: now,
      });
    }

    res.json(intelligence);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Force Refresh Developer Intelligence Insights
// @route   POST /api/analytics/insights/refresh
// @access  Private
export const refreshInsights = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;

    const githubStats = await GithubStats.findOne({ user: userId });
    const integrationProfile = await IntegrationProfile.findOne({ user: userId });

    const calculatedData = calculateDeveloperIntelligence(githubStats, integrationProfile);

    let intelligence = await DeveloperIntelligence.findOne({ user: userId });
    const now = new Date();

    if (intelligence) {
      intelligence.scores = calculatedData.scores;
      intelligence.strengths = calculatedData.strengths;
      intelligence.weaknesses = calculatedData.weaknesses;
      intelligence.recommendations = calculatedData.recommendations;
      intelligence.roadmap = calculatedData.roadmap;
      intelligence.lastCalculatedAt = now;
      await intelligence.save();
    } else {
      intelligence = await DeveloperIntelligence.create({
        user: userId,
        ...calculatedData,
        lastCalculatedAt: now,
      });
    }

    res.json(intelligence);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
