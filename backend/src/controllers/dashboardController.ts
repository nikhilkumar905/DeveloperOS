import { Request, Response } from 'express';
import Goal from '../models/Goal';
import Notification from '../models/Notification';
import TimelineEvent from '../models/TimelineEvent';
import IntegrationProfile from '../models/IntegrationProfile';

// GET /api/dashboard/stats
export const getStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;

    // Fetch integration profile
    let profile = await IntegrationProfile.findOne({ user: userId });
    if (!profile) {
      // Create a default empty profile for the user
      profile = await IntegrationProfile.create({
        user: userId,
        githubUsername: '',
        leetcodeUsername: '',
        leetcodeStats: { solvedTotal: 0, solvedEasy: 0, solvedMedium: 0, solvedHard: 0 }
      });

      // Seed a welcome notification and first milestone
      await Notification.create({
        user: userId,
        message: 'Welcome to PersonalOS! Seed your first developer goal today.',
        type: 'info'
      });

      await TimelineEvent.create({
        user: userId,
        title: 'Account Created',
        description: 'Joined PersonalOS developer workspace!',
        type: 'milestone'
      });
    }

    res.json({
      githubUsername: profile.githubUsername || 'Not connected',
      leetcodeUsername: profile.leetcodeUsername || 'Not connected',
      leetcodeStats: profile.leetcodeStats,
      activeProjectsCount: 3 // Mocked count for active projects
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/goals
export const getGoals = async (req: Request, res: Response) => {
  try {
    const goals = await Goal.find({ user: (req as any).user._id }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/dashboard/goals
export const createGoal = async (req: Request, res: Response) => {
  try {
    const { title, targetValue, unit, deadline } = req.body;
    const goal = await Goal.create({
      user: (req as any).user._id,
      title,
      targetValue,
      unit,
      deadline
    });

    // Publish timeline event
    await TimelineEvent.create({
      user: (req as any).user._id,
      title: 'Goal Started',
      description: `New goal set: ${title} (${targetValue} ${unit})`,
      type: 'milestone'
    });

    res.status(201).json(goal);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/notifications
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.find({ user: (req as any).user._id }).sort({ createdAt: -1 }).limit(10);
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/dashboard/notifications/:id/read
export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: (req as any).user._id });
    if (notification) {
      notification.read = true;
      await notification.save();
      res.json(notification);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/timeline
export const getTimeline = async (req: Request, res: Response) => {
  try {
    const events = await TimelineEvent.find({ user: (req as any).user._id }).sort({ timestamp: -1 });
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
