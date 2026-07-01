import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ActivityLog, IActivityLog } from '../models/ActivityLog';
import { ActivitySession } from '../models/ActivitySession';
import IntegrationProfile from '../models/IntegrationProfile';
import { rebuildDailySession, calculateStreak } from '../services/activityAggregator';

const toDateString = (d: Date): string => d.toISOString().split('T')[0];

/**
 * POST /api/activity/log
 * Receives a batch of activity events from the browser extension.
 * Body: { events: IActivityLog[] }
 */
export const logActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id as mongoose.Types.ObjectId;
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({ message: 'No events provided' });
      return;
    }

    // Validate and sanitize events
    const validPlatforms = ['github', 'leetcode', 'hackerrank', 'codeforces', 'geeksforgeeks', 'stackoverflow', 'docs', 'other'];
    const validTypes = [
      'repo_visit', 'repo_code_view', 'repo_push', 'repo_commit_view',
      'problem_view', 'problem_solved',
      'problem_attempted', 'article_read', 'docs_read', 'profile_view',
      'question_view', 'answer_view', 'contest_participated', 'pr_view',
      'issue_view', 'coding_session',
    ];

    const docs = events
      .filter((e: any) =>
        validPlatforms.includes(e.platform) && validTypes.includes(e.activityType)
      )
      .map((e: any) => ({
        user: userId,
        platform: e.platform,
        activityType: e.activityType,
        metadata: {
          url: e.metadata?.url || '',
          title: e.metadata?.title || '',
          repoName: e.metadata?.repoName || '',
          repoOwner: e.metadata?.repoOwner || '',
          problemName: e.metadata?.problemName || '',
          problemSlug: e.metadata?.problemSlug || '',
          difficulty: e.metadata?.difficulty || undefined,
          language: e.metadata?.language || '',
          tags: e.metadata?.tags || [],
          contestName: e.metadata?.contestName || '',
          score: e.metadata?.score || 0,
        },
        duration: typeof e.duration === 'number' ? e.duration : 0,
        timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
        synced: true,
      }));

    if (docs.length === 0) {
      res.status(400).json({ message: 'No valid events in batch' });
      return;
    }

    await ActivityLog.insertMany(docs);

    // Rebuild today's and possibly yesterday's session asynchronously
    const affectedDates = new Set<string>(docs.map((d: any) => toDateString(d.timestamp)));
    affectedDates.forEach((date) => {
      rebuildDailySession(userId, date).catch(console.error);
    });

    res.status(201).json({ message: `Logged ${docs.length} events`, count: docs.length });
  } catch (error: any) {
    console.error('logActivity error:', error);
    res.status(500).json({ message: 'Failed to log activity', error: error.message });
  }
};

/**
 * GET /api/activity/feed
 * Returns paginated activity log entries for the dashboard feed.
 * Query: ?page=1&limit=20&platform=github
 */
export const getActivityFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const platform = req.query.platform as string;

    const filter: any = { user: userId };
    if (platform && platform !== 'all') filter.platform = platform;

    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('getActivityFeed error:', error);
    res.status(500).json({ message: 'Failed to fetch activity feed', error: error.message });
  }
};

/**
 * GET /api/activity/summary
 * Returns today's aggregated activity summary + current streak.
 */
export const getActivitySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const today = toDateString(new Date());

    let session = await ActivitySession.findOne({ user: userId, date: today }).lean();

    // If no session yet today, return zeros
    if (!session) {
      const streak = await calculateStreak(userId);
      res.json({
        date: today,
        totalTimeMs: 0,
        platformBreakdown: {},
        problemsSolved: 0,
        problemsAttempted: 0,
        reposVisited: 0,
        articlesRead: 0,
        streak,
        productivityScore: 0,
        longestSession: 0,
        activePlatforms: [],
        recentActivity: [],
      });
      return;
    }

    // Get last 5 activity items for quick display
    const recentActivity = await ActivityLog.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();

    res.json({ ...session, recentActivity });
  } catch (error: any) {
    console.error('getActivitySummary error:', error);
    res.status(500).json({ message: 'Failed to fetch summary', error: error.message });
  }
};

/**
 * GET /api/activity/weekly
 * Returns last 7 days of session data for charts.
 */
export const getWeeklyActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;

    // Build last 7 day strings
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(toDateString(d));
    }

    const sessions = await ActivitySession.find({
      user: userId,
      date: { $in: days },
    }).lean();

    // Fill in zeros for missing days
    const sessionMap = new Map(sessions.map((s) => [s.date, s]));
    const result = days.map((date) => {
      const s = sessionMap.get(date);
      return s || {
        date,
        totalTimeMs: 0,
        problemsSolved: 0,
        productivityScore: 0,
        activePlatforms: [],
        platformBreakdown: {},
      };
    });

    res.json({ days: result });
  } catch (error: any) {
    console.error('getWeeklyActivity error:', error);
    res.status(500).json({ message: 'Failed to fetch weekly data', error: error.message });
  }
};

/**
 * GET /api/activity/heatmap
 * Returns last 90 days of session data for the heatmap calendar.
 */
export const getHeatmapData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const startDate = toDateString(ninetyDaysAgo);

    const sessions = await ActivitySession.find({
      user: userId,
      date: { $gte: startDate },
    })
      .select('date totalTimeMs problemsSolved productivityScore')
      .lean();

    res.json({ sessions });
  } catch (error: any) {
    console.error('getHeatmapData error:', error);
    res.status(500).json({ message: 'Failed to fetch heatmap data', error: error.message });
  }
};

/**
 * GET /api/activity/settings
 * Returns the user's per-platform tracking preferences.
 */
export const getActivitySettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const profile = await IntegrationProfile.findOne({ user: userId }).lean();

    const defaults = {
      github: true,
      leetcode: true,
      hackerrank: true,
      codeforces: true,
      geeksforgeeks: true,
      stackoverflow: true,
      docs: true,
    };

    const settings = (profile as any)?.activitySettings || defaults;
    res.json({ settings });
  } catch (error: any) {
    console.error('getActivitySettings error:', error);
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
};

/**
 * PUT /api/activity/settings
 * Updates the user's per-platform tracking preferences.
 * Body: { settings: { github: boolean, leetcode: boolean, ... } }
 */
export const updateActivitySettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ message: 'Invalid settings object' });
      return;
    }

    await IntegrationProfile.findOneAndUpdate(
      { user: userId },
      { $set: { activitySettings: settings } },
      { upsert: true }
    );

    res.json({ message: 'Settings updated', settings });
  } catch (error: any) {
    console.error('updateActivitySettings error:', error);
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};

/**
 * DELETE /api/activity/logs
 * Clears all activity logs and sessions for the user so they can start fresh.
 */
export const clearActivityLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    await ActivityLog.deleteMany({ user: userId });
    await ActivitySession.deleteMany({ user: userId });
    res.json({ message: 'All activity logs and sessions cleared successfully.' });
  } catch (error: any) {
    console.error('clearActivityLogs error:', error);
    res.status(500).json({ message: 'Failed to clear logs', error: error.message });
  }
};
