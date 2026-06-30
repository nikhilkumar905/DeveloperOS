import mongoose, { Schema, Document } from 'mongoose';

export interface IGeneratedDocument extends Document {
  user: mongoose.Types.ObjectId;
  documentType: 'RESUME_PDF' | 'PORTFOLIO_BUNDLE';
  title: string;
  templateOrTheme: string;
  atsScore: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

const GeneratedDocumentSchema = new Schema<IGeneratedDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    documentType: {
      type: String,
      enum: ['RESUME_PDF', 'PORTFOLIO_BUNDLE'],
      required: true
    },
    title: { type: String, required: true },
    templateOrTheme: { type: String, default: '' },
    atsScore: { type: Number, default: 0 },
    metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model<IGeneratedDocument>('GeneratedDocument', GeneratedDocumentSchema);
