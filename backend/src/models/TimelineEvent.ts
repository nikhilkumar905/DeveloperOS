import mongoose, { Schema, Document } from 'mongoose';

export interface ITimelineEvent extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: 'github' | 'leetcode' | 'milestone';
  timestamp: Date;
}

const TimelineEventSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['github', 'leetcode', 'milestone'], required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<ITimelineEvent>('TimelineEvent', TimelineEventSchema);
