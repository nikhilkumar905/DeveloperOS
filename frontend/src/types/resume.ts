/** Shape of the resume profile returned by /api/resume/profile. */
export interface IResumeProfile {
  _id?: string;
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
  targetRole: string;
  selectedTemplate: string;
  skills: {
    technical: string[];
    frameworks: string[];
    tools: string[];
    soft: string[];
  };
  categorizedSkills?: Array<{
    category: string;
    skills: string[];
  }>;
  experience: Array<{
    role: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    bullets: string[];
    liveUrl?: string;
    githubUrl?: string;
  }>;
  education: Array<{
    institution: string;
    location?: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string;
    gpa?: string;
    highlights?: string[];
  }>;
  hackathons?: Array<{
    name: string;
    achievement?: string;
    date?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    credentialUrl?: string;
  }>;
  customSections?: Array<{
    title: string;
    items: Array<{
      title: string;
      subtitle?: string;
      date?: string;
      bullets?: string[];
    }>;
  }>;
  achievements?: string[];
  atsScore: number;
  atsSuggestions: string[];
}
