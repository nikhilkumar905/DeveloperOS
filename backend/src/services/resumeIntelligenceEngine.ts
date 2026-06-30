import { IResumeProfile, IResumeProject, IExperienceItem, ResumeTemplateType } from '../models/ResumeProfile';
import { IGithubStats, IGithubRepository } from '../models/GithubStats';
import { IIntegrationProfile } from '../models/IntegrationProfile';
import { IDeveloperIntelligence } from '../models/DeveloperIntelligence';
import { IKnowledgeGraph } from '../models/KnowledgeGraph';

export interface IAtsAnalysisResult {
  score: number;
  keywordMatchRate: number;
  hasMeasurableMetrics: boolean;
  strongActionVerbsCount: number;
  suggestions: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
}

const ACTION_VERBS = [
  'architected', 'engineered', 'developed', 'implemented', 'designed',
  'optimized', 'spearheaded', 'scaled', 'built', 'integrated',
  'automated', 'reduced', 'increased', 'streamlined', 'transformed'
];

const ROLE_KEYWORDS: Record<ResumeTemplateType, string[]> = {
  'Software Engineer': ['data structures', 'algorithms', 'system design', 'rest api', 'git', 'ci/cd', 'testing', 'scalability', 'agile', 'object-oriented'],
  'Full Stack Developer': ['react', 'node.js', 'express', 'mongodb', 'rest api', 'frontend', 'backend', 'state management', 'responsive design', 'typescript'],
  'AI/ML Engineer': ['python', 'machine learning', 'data structures', 'algorithms', 'deep learning', 'pytorch', 'tensorflow', 'data pipelines', 'model training', 'analytics'],
  'Backend Developer': ['node.js', 'express', 'mongodb', 'sql', 'rest api', 'microservices', 'database optimization', 'authentication', 'docker', 'redis'],
  'Frontend Developer': ['react', 'typescript', 'tailwind css', 'state management', 'responsive design', 'ui/ux', 'performance optimization', 'html5', 'css3', 'webpack']
};

export const generateProjectBullets = (repo: IGithubRepository): string[] => {
  const bullets: string[] = [];
  const lowerDeps = repo.dependencies.map(d => d.toLowerCase());
  const filePaths = repo.filePaths || [];
  
  // 1. Architecture inference
  const hasMvc = filePaths.some(p => p.includes('controllers/') || p.includes('models/'));
  const hasRoutes = filePaths.some(p => p.includes('routes/'));
  const hasComponents = filePaths.some(p => p.includes('components/') || p.includes('pages/'));
  
  if (hasMvc && hasRoutes) {
    bullets.push(`Architected modular REST API service adhering to MVC principles with scalable route endpoints and middleware isolation.`);
  } else if (hasComponents) {
    bullets.push(`Designed responsive, component-driven user interface ensuring seamless interaction across devices.`);
  } else {
    bullets.push(`Developed clean, maintainable application architecture following modern software engineering standards.`);
  }

  // 2. Tech stack integration
  if (lowerDeps.includes('express') && lowerDeps.includes('mongoose')) {
    bullets.push(`Integrated high-performance Node.js/Express backend with MongoDB/Mongoose ORM for structured database operations.`);
  } else if (lowerDeps.includes('react') || lowerDeps.includes('next')) {
    bullets.push(`Engineered reactive client-side rendering pipeline utilizing modern frontend state management and lifecycle hooks.`);
  }

  // 3. Metrics or GitHub activity
  if (repo.stars > 0 || repo.forks > 0) {
    bullets.push(`Maintained open-source codebase gaining ${repo.stars} stars and ${repo.forks} forks from the developer community.`);
  } else {
    bullets.push(`Integrated automated testing and continuous version control using Git across multi-branch workflows.`);
  }

  return bullets;
};

export const inferResumeData = (
  user: any,
  githubStats: IGithubStats | null,
  integrationProfile: IIntegrationProfile | null,
  intelligence: IDeveloperIntelligence | null,
  graph: IKnowledgeGraph | null,
  targetRole: ResumeTemplateType = 'Software Engineer'
): Partial<IResumeProfile> => {
  const fullName = user?.name || 'Developer Name';
  const email = user?.email || '';

  // 1. Extract Skills from Graph or Top Languages
  const technical: string[] = [];
  const frameworks: string[] = [];
  const tools: string[] = ['Git', 'VS Code', 'GitHub', 'Postman'];
  const soft: string[] = ['System Architecture', 'Problem Solving', 'Code Review', 'Agile Collaboration'];

  if (graph?.nodes) {
    graph.nodes.forEach(n => {
      if (n.type === 'Technology') {
        const lbl = n.label;
        if (['TypeScript', 'JavaScript', 'Python', 'Java', 'C++', 'Go', 'HTML', 'CSS', 'SQL'].includes(lbl)) {
          if (!technical.includes(lbl)) technical.push(lbl);
        } else if (['React', 'Next.js', 'Express', 'Node.js', 'Tailwind CSS', 'Mongoose', 'Redux', 'Django', 'Spring Boot'].includes(lbl)) {
          if (!frameworks.includes(lbl)) frameworks.push(lbl);
        } else {
          if (!tools.includes(lbl)) tools.push(lbl);
        }
      } else if (n.type === 'Skill') {
        if (!soft.includes(n.label)) soft.push(n.label);
      }
    });
  }

  if (githubStats && githubStats.topLanguages) {
    const langs = githubStats.topLanguages instanceof Map 
      ? Array.from(githubStats.topLanguages.keys()) 
      : Object.keys(githubStats.topLanguages || {});
    langs.forEach(l => {
      if (!technical.includes(l)) technical.push(l);
    });
  }

  // Default fallback if empty
  if (technical.length === 0) technical.push('JavaScript', 'TypeScript', 'Node.js');
  if (frameworks.length === 0) frameworks.push('React', 'Express');

  // 2. Generate Projects
  const projects: IResumeProject[] = [];
  if (githubStats && githubStats.repositories.length > 0) {
    // Sort repositories by stars and filePaths richness
    const sortedRepos = [...githubStats.repositories].sort((a, b) => {
      const scoreA = a.stars * 5 + (a.filePaths?.length || 0) + a.dependencies.length;
      const scoreB = b.stars * 5 + (b.filePaths?.length || 0) + b.dependencies.length;
      return scoreB - scoreA;
    }).slice(0, 4);

    sortedRepos.forEach(repo => {
      projects.push({
        name: repo.name,
        description: repo.description || `Full-stack developer application built with ${repo.language || 'modern technologies'}.`,
        liveUrl: repo.url,
        githubUrl: repo.url,
        technologies: [...(repo.languages || []), ...(repo.dependencies || [])].slice(0, 6),
        bullets: generateProjectBullets(repo)
      });
    });
  }

  // 3. Generate Experience
  const experience: IExperienceItem[] = [];
  if (githubStats && githubStats.aggregatedStats) {
    const { totalCommits, totalPRs } = githubStats.aggregatedStats;
    if (totalCommits > 0 || totalPRs > 0) {
      experience.push({
        role: 'Open Source / Full Stack Contributor',
        company: 'GitHub Ecosystem',
        location: 'Remote',
        startDate: '2024',
        endDate: 'Present',
        current: true,
        bullets: [
          `Spearheaded development across multiple technical repositories, authoring ${totalCommits}+ verified git commits.`,
          `Architected and merged ${totalPRs}+ code pull requests following strict code quality standards and automated linting.`,
          `Collaborated on end-to-end full stack architecture leveraging ${technical.slice(0, 3).join(', ')} and ${frameworks.slice(0, 2).join(', ')}.`
        ],
        techStack: [...technical.slice(0, 3), ...frameworks.slice(0, 3)]
      });
    }
  }

  // 4. Generate Objective
  const devScore = intelligence?.scores?.overallScore || 85;
  const topStrengths = intelligence?.strengths?.slice(0, 3).join(', ') || 'full stack engineering and scalable system design';
  const careerObjective = `Innovative and results-driven ${targetRole} with a Developer Score of ${devScore}/100 and demonstrated expertise in ${topStrengths}. Proven record of engineering high-performance software architectures and delivering robust web applications.`;

  return {
    personalInfo: {
      fullName,
      jobTitle: targetRole,
      email,
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA / Remote',
      githubUrl: `https://github.com/${githubStats?.profile?.username || ''}`,
      linkedinUrl: 'https://linkedin.com/in/developer',
      websiteUrl: 'https://developer.os'
    },
    careerObjective,
    targetRole,
    selectedTemplate: targetRole,
    education: [
      {
        institution: 'University of Technology / Computer Science Institute',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science & Engineering',
        startYear: '2020',
        endYear: '2024',
        gpa: '3.8/4.0',
        highlights: [
          'Relevant Coursework: Data Structures & Algorithms, Operating Systems, Database Systems, Computer Networks.',
          'Lead Developer for University Open Source Society.'
        ]
      }
    ],
    experience,
    projects,
    skills: { technical, frameworks, tools, soft }
  };
};

export const analyzeAtsCompatibility = (
  profile: IResumeProfile,
  targetRole: ResumeTemplateType = 'Software Engineer'
): IAtsAnalysisResult => {
  const suggestions: string[] = [];
  const targetKeywords = ROLE_KEYWORDS[targetRole] || ROLE_KEYWORDS['Software Engineer'];
  
  // Combine all resume text for keyword scanning
  const allText = [
    profile.careerObjective,
    profile.personalInfo.jobTitle,
    ...profile.skills.technical,
    ...profile.skills.frameworks,
    ...profile.skills.tools,
    ...profile.experience.flatMap(e => [e.role, ...e.bullets]),
    ...profile.projects.flatMap(p => [p.name, p.description, ...p.bullets, ...p.technologies])
  ].join(' ').toLowerCase();

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  targetKeywords.forEach(kw => {
    if (allText.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  });

  const keywordMatchRate = Math.round((matchedKeywords.length / targetKeywords.length) * 100);

  // Check metrics (\d+% or \d++)
  const hasMeasurableMetrics = /\d+%|\d+\+|\d+x|\d+ /i.test(allText);

  // Check action verbs
  let strongActionVerbsCount = 0;
  ACTION_VERBS.forEach(verb => {
    if (allText.includes(verb)) strongActionVerbsCount++;
  });

  // Calculate ATS Score
  let score = 0;
  score += Math.round(keywordMatchRate * 0.45); // up to 45 pts
  if (hasMeasurableMetrics) score += 25; // 25 pts
  score += Math.min(20, strongActionVerbsCount * 4); // up to 20 pts
  if (profile.projects.length >= 2) score += 10; // 10 pts

  score = Math.min(100, Math.max(10, score));

  if (keywordMatchRate < 70) {
    suggestions.push(`Integrate key industry terms for ${targetRole}: consider adding "${missingKeywords.slice(0, 4).join('", "')}".`);
  }
  if (!hasMeasurableMetrics) {
    suggestions.push(`Add quantifiable impact to your experience or project bullets (e.g., "Improved query response time by 40%" or "Scaled API to handle 10,000+ requests").`);
  }
  if (strongActionVerbsCount < 3) {
    suggestions.push(`Begin bullet points with strong action verbs like "Architected", "Spearheaded", "Engineered", or "Optimized".`);
  }
  if (profile.projects.length < 2) {
    suggestions.push(`Highlight at least 2 complete technical projects to demonstrate hands-on application development.`);
  }
  if (suggestions.length === 0) {
    suggestions.push(`Your resume is exceptionally well-structured and fully optimized for ATS scanners!`);
  }

  return {
    score,
    keywordMatchRate,
    hasMeasurableMetrics,
    strongActionVerbsCount,
    suggestions,
    matchedKeywords,
    missingKeywords
  };
};
