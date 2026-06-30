import mongoose, { Schema, Document } from 'mongoose';

export interface IIntegrationProfile extends Document {
  user: mongoose.Types.ObjectId;
  githubUsername?: string;
  githubToken?: string;
  leetcodeUsername?: string;
  leetcodeStats?: {
    solvedTotal: number;
    solvedEasy: number;
    solvedMedium: number;
    solvedHard: number;
    contestRating: number;
    badges: number;
    streak: number;
    submissions: number;
    recentActivity: Array<{
      title: string;
      date: string;
      difficulty: string;
    }>;
    lastSyncedAt: Date;
  };
}

const IntegrationProfileSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    githubUsername: { type: String },
    githubToken: { type: String },
    leetcodeUsername: { type: String },
    leetcodeStats: {
      solvedTotal: { type: Number, default: 0 },
      solvedEasy: { type: Number, default: 0 },
      solvedMedium: { type: Number, default: 0 },
      solvedHard: { type: Number, default: 0 },
      contestRating: { type: Number, default: 0 },
      badges: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
      submissions: { type: Number, default: 0 },
      recentActivity: [
        {
          title: String,
          date: String,
          difficulty: String,
        }
      ],
      lastSyncedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IIntegrationProfile>('IntegrationProfile', IntegrationProfileSchema);
