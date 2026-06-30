import mongoose, { Document, Schema } from 'mongoose';

export interface IGithubRepository {
  name: string;
  url: string;
  stars: number;
  forks: number;
  language: string;
  languages: string[];
  dependencies: string[];
  filePaths: string[];
  defaultBranch: string;
  description: string;
}

export interface IGithubStats extends Document {
  user: mongoose.Types.ObjectId;
  profile: {
    username: string;
    avatarUrl: string;
    bio: string;
    followers: number;
    following: number;
    publicRepos: number;
  };
  repositories: IGithubRepository[];
  aggregatedStats: {
    totalCommits: number;
    totalPRs: number;
    totalIssues: number;
    totalStars: number;
  };
  topLanguages: Record<string, number>;
  lastSyncedAt: Date;
}

const GithubRepositorySchema = new Schema<IGithubRepository>({
  name: { type: String, required: true },
  url: { type: String, required: true },
  stars: { type: Number, default: 0 },
  forks: { type: Number, default: 0 },
  language: { type: String, default: 'Unknown' },
  languages: { type: [String], default: [] },
  dependencies: { type: [String], default: [] },
  filePaths: { type: [String], default: [] },
  defaultBranch: { type: String, default: 'main' },
  description: { type: String, default: '' },
});

const GithubStatsSchema = new Schema<IGithubStats>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    profile: {
      username: { type: String, required: true },
      avatarUrl: { type: String, required: true },
      bio: { type: String, default: '' },
      followers: { type: Number, default: 0 },
      following: { type: Number, default: 0 },
      publicRepos: { type: Number, default: 0 },
    },
    repositories: [GithubRepositorySchema],
    aggregatedStats: {
      totalCommits: { type: Number, default: 0 },
      totalPRs: { type: Number, default: 0 },
      totalIssues: { type: Number, default: 0 },
      totalStars: { type: Number, default: 0 },
    },
    topLanguages: { type: Map, of: Number, default: {} },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const GithubStats = mongoose.model<IGithubStats>('GithubStats', GithubStatsSchema);
