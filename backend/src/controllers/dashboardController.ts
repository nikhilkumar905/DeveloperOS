import { Request, Response } from 'express';
import Goal from '../models/Goal';
import Notification from '../models/Notification';
import TimelineEvent from '../models/TimelineEvent';
import IntegrationProfile from '../models/IntegrationProfile';
import { GithubStats } from '../models/GithubStats';

// GET /api/dashboard/stats
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;

    let profile = await IntegrationProfile.findOne({ user: userId });
    if (!profile) {
      profile = await IntegrationProfile.create({
        user: userId,
        githubUsername: '',
        leetcodeUsername: '',
        leetcodeStats: { solvedTotal: 0, solvedEasy: 0, solvedMedium: 0, solvedHard: 0 },
      });

      await Notification.create({
        user: userId,
        message: 'Welcome to PersonalOS! Connect GitHub and LeetCode to get started.',
        type: 'info',
      });

      await TimelineEvent.create({
        user: userId,
        title: 'Account Created',
        description: 'Joined PersonalOS developer workspace!',
        type: 'milestone',
      });
    }

    // Get real active project count from GitHub stats
    const githubStats = await GithubStats.findOne({ user: userId }).select('repositories').lean();
    const activeProjectsCount = githubStats?.repositories?.length ?? 0;

    res.json({
      githubUsername: profile.githubUsername || null,
      leetcodeUsername: profile.leetcodeUsername || null,
      leetcodeStats: profile.leetcodeStats,
      activeProjectsCount,
      lastSyncedAt: githubStats ? (githubStats as any).lastSyncedAt : null,
    });
  } catch (error: any) {
    console.error('[dashboardController] getStats error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/goals
export const getGoals = async (req: Request, res: Response): Promise<void> => {
  try {
    const goals = await Goal.find({ user: (req as any).user._id }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error: any) {
    console.error('[dashboardController] getGoals error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/dashboard/goals
export const createGoal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, targetValue, unit, deadline } = req.body;

    if (!title || !targetValue || !unit || !deadline) {
      res.status(400).json({ message: 'title, targetValue, unit, and deadline are required' });
      return;
    }

    const goal = await Goal.create({
      user: (req as any).user._id,
      title: title.trim(),
      targetValue: Number(targetValue),
      unit: unit.trim(),
      deadline,
    });

    await TimelineEvent.create({
      user: (req as any).user._id,
      title: 'Goal Started',
      description: `New goal set: ${title} (${targetValue} ${unit})`,
      type: 'milestone',
    });

    res.status(201).json(goal);
  } catch (error: any) {
    console.error('[dashboardController] createGoal error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/notifications
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ user: (req as any).user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (error: any) {
    console.error('[dashboardController] getNotifications error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/dashboard/notifications/:id/read
export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: (req as any).user._id,
    });

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (error: any) {
    console.error('[dashboardController] markNotificationRead error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/timeline
export const getTimeline = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    const events = await TimelineEvent.find({ user: (req as any).user._id })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(events);
  } catch (error: any) {
    console.error('[dashboardController] getTimeline error:', error.message);
    res.status(500).json({ message: error.message });
  }
};
