import mongoose, { Schema, Document } from 'mongoose';

export interface IGraphNode {
  id: string;
  label: string;
  type: 'Domain' | 'Skill' | 'Technology' | 'Concept' | 'Repository' | 'Topic' | 'Achievement' | 'Developer';
  properties?: Record<string, any>;
}

export interface IGraphEdge {
  source: string;
  target: string;
  relationship: 'USES' | 'REQUIRES' | 'IMPROVES' | 'PART_OF' | 'RELATED_TO' | 'HAS_SKILL' | 'OWNS' | 'DEPENDS_ON' | 'BELONGS_TO' | 'IMPLEMENTS';
  weight: number;
}

export interface IKnowledgeGraph extends Document {
  user: mongoose.Types.ObjectId;
  nodes: IGraphNode[];
  edges: IGraphEdge[];
  lastUpdated: Date;
}

const NodeSchema = new Schema<IGraphNode>({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Domain', 'Skill', 'Technology', 'Concept', 'Repository', 'Topic', 'Achievement', 'Developer'], 
    required: true 
  },
  properties: { type: Map, of: Schema.Types.Mixed, default: {} }
}, { _id: false });

const EdgeSchema = new Schema<IGraphEdge>({
  source: { type: String, required: true },
  target: { type: String, required: true },
  relationship: { 
    type: String, 
    enum: ['USES', 'REQUIRES', 'IMPROVES', 'PART_OF', 'RELATED_TO', 'HAS_SKILL', 'OWNS', 'DEPENDS_ON', 'BELONGS_TO', 'IMPLEMENTS'], 
    required: true 
  },
  weight: { type: Number, default: 1 }
}, { _id: false });

const KnowledgeGraphSchema = new Schema<IKnowledgeGraph>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    nodes: [NodeSchema],
    edges: [EdgeSchema],
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IKnowledgeGraph>('KnowledgeGraph', KnowledgeGraphSchema);
