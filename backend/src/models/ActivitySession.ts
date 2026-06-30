import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformBreakdown {
  github: number;
  leetcode: number;
  hackerrank: number;
  codeforces: number;
  geeksforgeeks: number;
  stackoverflow: number;
  docs: number;
  other: number;
}

export interface IActivitySession extends Document {
  user: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD format
  totalTimeMs: number;
  platformBreakdown: IPlatformBreakdown;
  problemsSolved: number;
  problemsAttempted: number;
  reposVisited: number;
  articlesRead: number;
  streak: number; // consecutive days active
  productivityScore: number; // 0-100 computed score
  longestSession: number; // ms
  activePlatforms: string[];
  updatedAt: Date;
}

const ActivitySessionSchema = new Schema<IActivitySession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    totalTimeMs: { type: Number, default: 0 },
    platformBreakdown: {
      github: { type: Number, default: 0 },
      leetcode: { type: Number, default: 0 },
      hackerrank: { type: Number, default: 0 },
      codeforces: { type: Number, default: 0 },
      geeksforgeeks: { type: Number, default: 0 },
      stackoverflow: { type: Number, default: 0 },
      docs: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    problemsSolved: { type: Number, default: 0 },
    problemsAttempted: { type: Number, default: 0 },
    reposVisited: { type: Number, default: 0 },
    articlesRead: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    productivityScore: { type: Number, default: 0 },
    longestSession: { type: Number, default: 0 },
    activePlatforms: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Unique per user per day
ActivitySessionSchema.index({ user: 1, date: 1 }, { unique: true });

export const ActivitySession = mongoose.model<IActivitySession>('ActivitySession', ActivitySessionSchema);
