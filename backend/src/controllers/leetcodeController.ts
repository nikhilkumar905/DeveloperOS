import { Request, Response } from 'express';
import IntegrationProfile from '../models/IntegrationProfile';
import { fetchLeetCodeProfile } from '../services/leetcodeService';
import TimelineEvent from '../models/TimelineEvent';

// @desc    Connect LeetCode Account
// @route   POST /api/leetcode/connect
// @access  Private
export const connectLeetCode = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const userId = (req as any).user._id;

    // Verify the username exists by fetching stats
    const stats = await fetchLeetCodeProfile(username);

    let profile = await IntegrationProfile.findOne({ user: userId });
    
    if (!profile) {
      profile = new IntegrationProfile({ user: userId });
    }

    profile.leetcodeUsername = username;
    profile.leetcodeStats = {
      ...stats,
      lastSyncedAt: new Date(),
    };

    await profile.save();

    await TimelineEvent.create({
      user: userId,
      title: 'LeetCode Connected',
      description: `Linked LeetCode account: ${username}`,
      type: 'leetcode',
    });

    res.json(profile.leetcodeStats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Disconnect LeetCode Account
// @route   POST /api/leetcode/disconnect
// @access  Private
export const disconnectLeetCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    let profile = await IntegrationProfile.findOne({ user: userId });

    if (profile) {
      profile.leetcodeUsername = '';
      profile.leetcodeStats = {
        solvedTotal: 0,
        solvedEasy: 0,
        solvedMedium: 0,
        solvedHard: 0,
        contestRating: 0,
        badges: 0,
        streak: 0,
        submissions: 0,
        recentActivity: [],
        lastSyncedAt: new Date(),
      };
      await profile.save();
    }

    res.json({ message: 'LeetCode disconnected' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Sync LeetCode Data
// @route   POST /api/leetcode/sync
// @access  Private
export const syncLeetCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const profile = await IntegrationProfile.findOne({ user: userId });

    if (!profile || !profile.leetcodeUsername) {
      return res.status(400).json({ message: 'LeetCode not connected' });
    }

    const stats = await fetchLeetCodeProfile(profile.leetcodeUsername);
    
    profile.leetcodeStats = {
      ...stats,
      lastSyncedAt: new Date(),
    };

    await profile.save();

    res.json(profile.leetcodeStats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get LeetCode Stats
// @route   GET /api/leetcode/stats
// @access  Private
export const getLeetCodeStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const profile = await IntegrationProfile.findOne({ user: userId });

    if (!profile || !profile.leetcodeUsername) {
      return res.json(null);
    }

    res.json({
      username: profile.leetcodeUsername,
      stats: profile.leetcodeStats,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
