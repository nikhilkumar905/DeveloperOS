import mongoose, { Schema, Document } from 'mongoose';

export interface IDeveloperIntelligence extends Document {
  user: mongoose.Types.ObjectId;
  scores: {
    dsa: number;
    frontend: number;
    backend: number;
    fullStack: number;
    consistency: number;
    productivity: number;
    interviewReadiness: number;
    overallScore: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  roadmap: string[];
  lastCalculatedAt: Date;
}

const DeveloperIntelligenceSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    scores: {
      dsa: { type: Number, default: 0 },
      frontend: { type: Number, default: 0 },
      backend: { type: Number, default: 0 },
      fullStack: { type: Number, default: 0 },
      consistency: { type: Number, default: 0 },
      productivity: { type: Number, default: 0 },
      interviewReadiness: { type: Number, default: 0 },
      overallScore: { type: Number, default: 0 },
    },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    recommendations: [{ type: String }],
    roadmap: [{ type: String }],
    lastCalculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IDeveloperIntelligence>('DeveloperIntelligence', DeveloperIntelligenceSchema);
