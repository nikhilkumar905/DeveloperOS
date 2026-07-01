import mongoose, { Document, Schema } from 'mongoose';

export type Platform =
  | 'github'
  | 'leetcode'
  | 'hackerrank'
  | 'codeforces'
  | 'geeksforgeeks'
  | 'stackoverflow'
  | 'docs'
  | 'other';

export type ActivityType =
  | 'repo_visit'
  | 'repo_code_view'
  | 'repo_push'
  | 'repo_commit_view'
  | 'problem_view'
  | 'problem_solved'
  | 'problem_attempted'
  | 'article_read'
  | 'docs_read'
  | 'profile_view'
  | 'question_view'
  | 'answer_view'
  | 'contest_participated'
  | 'pr_view'
  | 'issue_view'
  | 'coding_session';

export interface IActivityLog extends Document {
  user: mongoose.Types.ObjectId;
  platform: Platform;
  activityType: ActivityType;
  metadata: {
    url?: string;
    title?: string;
    repoName?: string;
    repoOwner?: string;
    problemName?: string;
    problemSlug?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    language?: string;
    tags?: string[];
    contestName?: string;
    score?: number;
  };
  duration: number;
  timestamp: Date;
  synced: boolean;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: {
      type: String,
      enum: ['github', 'leetcode', 'hackerrank', 'codeforces', 'geeksforgeeks', 'stackoverflow', 'docs', 'other'],
      required: true,
    },
    activityType: {
      type: String,
      enum: [
        'repo_visit', 'repo_code_view', 'repo_push', 'repo_commit_view',
        'problem_view', 'problem_solved',
        'problem_attempted', 'article_read', 'docs_read', 'profile_view',
        'question_view', 'answer_view', 'contest_participated', 'pr_view',
        'issue_view', 'coding_session',
      ],
      required: true,
    },
    metadata: {
      url: { type: String, default: '' },
      title: { type: String, default: '' },
      repoName: { type: String, default: '' },
      repoOwner: { type: String, default: '' },
      problemName: { type: String, default: '' },
      problemSlug: { type: String, default: '' },
      difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', undefined], default: undefined },
      language: { type: String, default: '' },
      tags: { type: [String], default: [] },
      contestName: { type: String, default: '' },
      score: { type: Number, default: 0 },
    },
    duration: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now, index: true },
    synced: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ user: 1, timestamp: -1 });
ActivityLogSchema.index({ user: 1, platform: 1, timestamp: -1 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
