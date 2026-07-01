import mongoose, { Schema, Document } from 'mongoose';

export interface IEducationItem {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  gpa?: string;
  highlights?: string[];
}

export interface IExperienceItem {
  role: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  bullets: string[];
  techStack?: string[];
}

export interface IResumeProject {
  name: string;
  description: string;
  liveUrl?: string;
  githubUrl?: string;
  technologies: string[];
  bullets: string[];
}

export interface ICertificationItem {
  name: string;
  issuer: string;
  issueDate?: string;
  credentialUrl?: string;
}

export interface IHackathonItem {
  name: string;
  achievement?: string;
  date?: string;
}

export interface ICategorizedSkill {
  category: string;
  skills: string[];
}

export interface ICustomSectionItem {
  title: string;
  subtitle?: string;
  date?: string;
  bullets?: string[];
}

export interface ICustomSection {
  title: string;
  items: ICustomSectionItem[];
}

export type ResumeTemplateType = 
  | 'Software Engineer' 
  | 'Full Stack Developer' 
  | 'AI/ML Engineer' 
  | 'Backend Developer' 
  | 'Frontend Developer';

export interface IResumeProfile extends Document {
  user: mongoose.Types.ObjectId;
  personalInfo: {
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    location: string;
    githubUrl: string;
    linkedinUrl: string;
    websiteUrl: string;
    customLinks?: Array<{ label: string; url: string }>;
  };
  careerObjective: string;
  targetRole: ResumeTemplateType;
  selectedTemplate: ResumeTemplateType;
  education: IEducationItem[];
  experience: IExperienceItem[];
  projects: IResumeProject[];
  skills: {
    technical: string[];
    frameworks: string[];
    tools: string[];
    soft: string[];
  };
  certifications: ICertificationItem[];
  hackathons?: IHackathonItem[];
  categorizedSkills?: ICategorizedSkill[];
  customSections?: ICustomSection[];
  achievements: string[];
  atsScore: number;
  atsSuggestions: string[];
  lastInferredAt?: Date;
}

const EducationSchema = new Schema<IEducationItem>({
  institution: { type: String, required: true },
  degree: { type: String, required: true },
  fieldOfStudy: { type: String, default: '' },
  startYear: { type: String, default: '' },
  endYear: { type: String, default: '' },
  gpa: { type: String, default: '' },
  highlights: { type: [String], default: [] }
});

const ExperienceSchema = new Schema<IExperienceItem>({
  role: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  current: { type: Boolean, default: false },
  bullets: { type: [String], default: [] },
  techStack: { type: [String], default: [] }
});

const ProjectSchema = new Schema<IResumeProject>({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  liveUrl: { type: String, default: '' },
  githubUrl: { type: String, default: '' },
  technologies: { type: [String], default: [] },
  bullets: { type: [String], default: [] }
});

const CertificationSchema = new Schema<ICertificationItem>({
  name: { type: String, required: true },
  issuer: { type: String, required: true },
  issueDate: { type: String, default: '' },
  credentialUrl: { type: String, default: '' }
});

const HackathonSchema = new Schema<IHackathonItem>({
  name: { type: String, required: true },
  achievement: { type: String, default: '' },
  date: { type: String, default: '' }
});

const CategorizedSkillSchema = new Schema<ICategorizedSkill>({
  category: { type: String, required: true },
  skills: { type: [String], default: [] }
});

const CustomSectionItemSchema = new Schema<ICustomSectionItem>({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  date: { type: String, default: '' },
  bullets: { type: [String], default: [] }
});

const CustomSectionSchema = new Schema<ICustomSection>({
  title: { type: String, required: true },
  items: { type: [CustomSectionItemSchema], default: [] }
});

const ResumeProfileSchema = new Schema<IResumeProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    personalInfo: {
      fullName: { type: String, default: '' },
      jobTitle: { type: String, default: 'Software Engineer' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      location: { type: String, default: '' },
      githubUrl: { type: String, default: '' },
      linkedinUrl: { type: String, default: '' },
      websiteUrl: { type: String, default: '' },
      customLinks: { type: [{ label: String, url: String }], default: [] },
    },
    careerObjective: { type: String, default: '' },
    targetRole: {
      type: String,
      enum: ['Software Engineer', 'Full Stack Developer', 'AI/ML Engineer', 'Backend Developer', 'Frontend Developer'],
      default: 'Software Engineer'
    },
    selectedTemplate: {
      type: String,
      enum: ['Software Engineer', 'Full Stack Developer', 'AI/ML Engineer', 'Backend Developer', 'Frontend Developer'],
      default: 'Software Engineer'
    },
    education: { type: [EducationSchema], default: [] },
    experience: { type: [ExperienceSchema], default: [] },
    projects: { type: [ProjectSchema], default: [] },
    skills: {
      technical: { type: [String], default: [] },
      frameworks: { type: [String], default: [] },
      tools: { type: [String], default: [] },
      soft: { type: [String], default: [] },
    },
    certifications: { type: [CertificationSchema], default: [] },
    hackathons: { type: [HackathonSchema], default: [] },
    categorizedSkills: { type: [CategorizedSkillSchema], default: [] },
    customSections: { type: [CustomSectionSchema], default: [] },
    achievements: { type: [String], default: [] },
    atsScore: { type: Number, default: 0 },
    atsSuggestions: { type: [String], default: [] },
    lastInferredAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model<IResumeProfile>('ResumeProfile', ResumeProfileSchema);
