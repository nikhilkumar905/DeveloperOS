import mongoose, { Schema, Document } from 'mongoose';

export interface IGoal extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: Date;
  status: 'active' | 'completed' | 'failed';
}

const GoalSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    targetValue: { type: Number, required: true },
    currentValue: { type: Number, default: 0 },
    unit: { type: String, required: true },
    deadline: { type: Date, required: true },
    status: { type: String, enum: ['active', 'completed', 'failed'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model<IGoal>('Goal', GoalSchema);
