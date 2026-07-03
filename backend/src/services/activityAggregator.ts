import { ActivityLog, IActivityLog, Platform } from '../models/ActivityLog';
import { ActivitySession } from '../models/ActivitySession';
import mongoose from 'mongoose';

/**
 * Format a Date to YYYY-MM-DD string in local time
 */
const toDateString = (d: Date): string => d.toISOString().split('T')[0];

/**
 * Computes a productivity score (0-100) from session data.
 * Rewards: variety of platforms, problems solved, time spent coding.
 */
const computeProductivityScore = (
  totalTimeMs: number,
  problemsSolved: number,
  activePlatformsCount: number,
  articlesRead: number
): number => {
  // Time component: 2 hours of coding = 50 points max
  const timeScore = Math.min(50, (totalTimeMs / (2 * 60 * 60 * 1000)) * 50);
  // Problems solved: each problem = 8 points, max 30
  const problemScore = Math.min(30, problemsSolved * 8);
  // Variety: each active platform = 3 points, max 15
  const varietyScore = Math.min(15, activePlatformsCount * 3);
  // Learning: each article = 1 point, max 5
  const learningScore = Math.min(5, articlesRead);

  return Math.round(timeScore + problemScore + varietyScore + learningScore);
};

/**
 * Calculates streak for a user by counting consecutive days with activity sessions
 */
export const calculateStreak = async (userId: mongoose.Types.ObjectId): Promise<number> => {
  const today = toDateString(new Date());
  const sessions = await ActivitySession.find({ user: userId })
    .sort({ date: -1 })
    .select('date')
    .lean();

  if (!sessions.length) return 0;

  // Build set of active dates
  const activeDates = new Set(sessions.map((s) => s.date));

  let streak = 0;
  const current = new Date();

  // Start from today; if today has no activity, check yesterday (streak still valid)
  if (!activeDates.has(toDateString(current))) {
    current.setDate(current.getDate() - 1);
    if (!activeDates.has(toDateString(current))) return 0;
  }

  while (activeDates.has(toDateString(current))) {
    streak++;
    current.setDate(current.getDate() - 1);
  }

  return streak;
};

/**
 * Rebuilds (upserts) the ActivitySession document for a given user + date
 * by aggregating all ActivityLog entries for that day.
 */
export const rebuildDailySession = async (
  userId: mongoose.Types.ObjectId,
  date: string
): Promise<void> => {
  // Date range for the day (UTC)
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  const logs: IActivityLog[] = await ActivityLog.find({
    user: userId,
    timestamp: { $gte: startOfDay, $lte: endOfDay },
  }).lean() as unknown as IActivityLog[];

  if (!logs.length) return;

  const platformBreakdown: Record<string, number> = {
    github: 0, leetcode: 0, hackerrank: 0, codeforces: 0,
    geeksforgeeks: 0, stackoverflow: 0, docs: 0, other: 0,
  };

  let problemsSolved = 0;
  let problemsAttempted = 0;
  let reposVisited = 0;
  let articlesRead = 0;
  let totalTimeMs = 0;
  let longestSession = 0;

  for (const log of logs) {
    const platform = log.platform as Platform;
    platformBreakdown[platform] = (platformBreakdown[platform] || 0) + log.duration;
    totalTimeMs += log.duration;

    if (log.duration > longestSession) longestSession = log.duration;

    if (log.activityType === 'problem_solved') problemsSolved++;
    if (log.activityType === 'problem_attempted') problemsAttempted++;
    if (log.activityType === 'repo_visit' || log.activityType === 'repo_push') reposVisited++;
    if (['article_read', 'docs_read'].includes(log.activityType)) articlesRead++;
  }

  const activePlatforms = Object.entries(platformBreakdown)
    .filter(([, ms]) => ms > 0)
    .map(([p]) => p);

  const productivityScore = computeProductivityScore(
    totalTimeMs,
    problemsSolved,
    activePlatforms.length,
    articlesRead
  );

  // Calculate streak (uses existing sessions in DB)
  const streak = await calculateStreak(userId);

  await ActivitySession.findOneAndUpdate(
    { user: userId, date },
    {
      $set: {
        totalTimeMs,
        platformBreakdown,
        problemsSolved,
        problemsAttempted,
        reposVisited,
        articlesRead,
        streak,
        productivityScore,
        longestSession,
        activePlatforms,
        updatedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after' }
  );
};
