import mongoose, { Schema, Document } from 'mongoose';

export type PortfolioThemeType = 'modern-dark' | 'minimal-light' | 'cyberpunk' | 'glassmorphism';
export type PortfolioFontType = 'Inter' | 'Roboto' | 'Outfit' | 'Fira Code';

export interface IPortfolioLink {
  label: string;
  url: string;
  icon?: string;
}

export interface IPortfolioSettings extends Document {
  user: mongoose.Types.ObjectId;
  theme: PortfolioThemeType;
  primaryColor: string;
  fontFamily: PortfolioFontType;
  profilePictureUrl: string;
  heroSubtitle: string;
  bio: string;
  sectionVisibility: {
    showSkills: boolean;
    showProjects: boolean;
    showExperience: boolean;
    showEducation: boolean;
    showLeetCode: boolean;
    showGraph: boolean;
  };
  featuredProjects: string[];
  customLinks: IPortfolioLink[];
}

const LinkSchema = new Schema<IPortfolioLink>({
  label: { type: String, required: true },
  url: { type: String, required: true },
  icon: { type: String, default: 'Globe' }
});

const PortfolioSettingsSchema = new Schema<IPortfolioSettings>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    theme: {
      type: String,
      enum: ['modern-dark', 'minimal-light', 'cyberpunk', 'glassmorphism'],
      default: 'modern-dark'
    },
    primaryColor: { type: String, default: '#6366f1' },
    fontFamily: {
      type: String,
      enum: ['Inter', 'Roboto', 'Outfit', 'Fira Code'],
      default: 'Inter'
    },
    profilePictureUrl: { type: String, default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' },
    heroSubtitle: { type: String, default: 'Building scalable software systems & intelligent applications' },
    bio: { type: String, default: '' },
    sectionVisibility: {
      showSkills: { type: Boolean, default: true },
      showProjects: { type: Boolean, default: true },
      showExperience: { type: Boolean, default: true },
      showEducation: { type: Boolean, default: true },
      showLeetCode: { type: Boolean, default: true },
      showGraph: { type: Boolean, default: true },
    },
    featuredProjects: { type: [String], default: [] },
    customLinks: { type: [LinkSchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model<IPortfolioSettings>('PortfolioSettings', PortfolioSettingsSchema);
