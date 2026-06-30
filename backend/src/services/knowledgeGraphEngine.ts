import { IGithubStats } from '../models/GithubStats';
import { IIntegrationProfile } from '../models/IntegrationProfile';
import { IGraphNode, IGraphEdge } from '../models/KnowledgeGraph';

const DEP_TO_TECH: Record<string, string> = {
  'react': 'React',
  'react-dom': 'React',
  'next': 'Next.js',
  'express': 'Express',
  'mongoose': 'MongoDB',
  'mongodb': 'MongoDB',
  'typescript': 'TypeScript',
  'tailwindcss': 'Tailwind CSS',
  'vue': 'Vue.js',
  'svelte': 'Svelte',
  'flask': 'Flask',
  'django': 'Django',
  'fastapi': 'FastAPI',
  'langchain': 'LangChain',
  'transformers': 'Transformers',
  'ollama': 'Ollama',
  'jsonwebtoken': 'JWT',
  'socket.io': 'Socket.io',
  'redux': 'Redux',
  'firebase': 'Firebase',
  'redis': 'Redis',
  'graphql': 'GraphQL',
  'pg': 'PostgreSQL',
  'mysql': 'MySQL',
  'prisma': 'Prisma',
  'zustand': 'Zustand',
  '@google/genai': 'Gemini',
  'jest': 'Jest',
  'vitest': 'Vitest',
  'cypress': 'Cypress',
  'passport': 'OAuth',
};

const PATH_TO_TECH: { regex: RegExp, tech: string }[] = [
  { regex: /(^|\/)Dockerfile$/i, tech: 'Docker' },
  { regex: /(^|\/)docker-compose\.ya?ml$/i, tech: 'Docker Compose' },
  { regex: /\.github\/workflows\/.*\.ya?ml$/i, tech: 'GitHub Actions' },
  { regex: /(^|\/)vercel\.json$/i, tech: 'Vercel' },
  { regex: /(^|\/)railway\.toml$/i, tech: 'Railway' },
  { regex: /(^|\/)render\.ya?ml$/i, tech: 'Render' },
  { regex: /(^|\/)prisma\/schema\.prisma$/i, tech: 'Prisma' },
  { regex: /(^|\/)(src|server|backend|api)?\/?controllers\//i, tech: 'MVC Architecture' },
  { regex: /(^|\/)(src|server|backend|api)?\/?routes\//i, tech: 'REST APIs' },
  { regex: /(^|\/)(src|server|backend|api)?\/?middleware\//i, tech: 'Middleware' },
  { regex: /(^|\/)kubernetes\/.*\.ya?ml$/i, tech: 'Kubernetes' },
  { regex: /(^|\/)node_modules\/express\//i, tech: 'Express' },
  { regex: /(^|\/)node_modules\/mongoose\//i, tech: 'MongoDB' },
  { regex: /(^|\/)node_modules\/react\//i, tech: 'React' },
  { regex: /(^|\/)node_modules\/socket\.io\//i, tech: 'Socket.io' },
];

const TECH_TO_CONCEPT: Record<string, string[]> = {
  'React': ['UI Components', 'State Management'],
  'Next.js': ['Server-Side Rendering', 'React Framework'],
  'Express': ['REST API', 'Web Server'],
  'MongoDB': ['NoSQL Database'],
  'TypeScript': ['Static Typing'],
  'Tailwind CSS': ['Utility-First CSS'],
  'Flask': ['REST API', 'Web Server'],
  'Django': ['Web Framework', 'ORM'],
  'FastAPI': ['REST API', 'Async Programming'],
  'LangChain': ['LLM Orchestration', 'RAG'],
  'Transformers': ['Machine Learning', 'NLP'],
  'Ollama': ['Local LLMs'],
  'Gemini': ['Generative AI', 'LLM Integration'],
  'JWT': ['Authentication'],
  'OAuth': ['Authentication', 'Authorization'],
  'Socket.io': ['Real-time Communication'],
  'Redux': ['State Management'],
  'Zustand': ['State Management'],
  'Firebase': ['BaaS', 'Realtime Database'],
  'Redis': ['In-Memory Cache'],
  'GraphQL': ['API Query Language'],
  'Docker': ['Containerization'],
  'Docker Compose': ['Container Orchestration'],
  'Kubernetes': ['Container Orchestration', 'Microservices'],
  'GitHub Actions': ['CI/CD'],
  'Vercel': ['Serverless Deployment', 'PaaS'],
  'Railway': ['PaaS'],
  'Render': ['PaaS'],
  'Prisma': ['ORM'],
  'Jest': ['Unit Testing'],
  'Vitest': ['Unit Testing'],
  'Cypress': ['End-to-End Testing'],
  'MVC Architecture': ['Design Patterns'],
  'REST APIs': ['API Design'],
  'Middleware': ['API Design'],
  'Java': ['Object-Oriented Programming'],
  'C++': ['Systems Programming'],
  'Python': ['Scripting', 'Data Science'],
  'JavaScript': ['Web Scripting'],
  'Go': ['Systems Programming', 'Concurrency'],
  'PostgreSQL': ['Relational Database'],
  'MySQL': ['Relational Database'],
};

const CONCEPT_TO_SKILL: Record<string, string[]> = {
  'UI Components': ['Frontend Development'],
  'State Management': ['Frontend Development'],
  'Server-Side Rendering': ['Frontend Development', 'Backend Development'],
  'REST API': ['Backend Development'],
  'Web Server': ['Backend Development'],
  'NoSQL Database': ['Database Management'],
  'Static Typing': ['Software Engineering'],
  'Utility-First CSS': ['Frontend Development'],
  'Web Framework': ['Backend Development'],
  'ORM': ['Backend Development', 'Database Management'],
  'Async Programming': ['Software Engineering'],
  'LLM Orchestration': ['AI/ML Engineering'],
  'RAG': ['AI/ML Engineering'],
  'Machine Learning': ['AI/ML Engineering'],
  'NLP': ['AI/ML Engineering'],
  'Local LLMs': ['AI/ML Engineering'],
  'Generative AI': ['AI/ML Engineering'],
  'LLM Integration': ['AI/ML Engineering'],
  'Authentication': ['Security'],
  'Authorization': ['Security'],
  'Real-time Communication': ['Backend Development'],
  'BaaS': ['Cloud Computing'],
  'Realtime Database': ['Database Management'],
  'In-Memory Cache': ['Backend Development', 'DevOps'],
  'API Query Language': ['Backend Development'],
  'Containerization': ['DevOps', 'Cloud Computing'],
  'Container Orchestration': ['DevOps', 'Cloud Computing'],
  'Microservices': ['Software Architecture', 'Backend Development'],
  'CI/CD': ['DevOps'],
  'Serverless Deployment': ['Cloud Computing', 'DevOps'],
  'PaaS': ['Cloud Computing'],
  'Unit Testing': ['Software Engineering', 'Quality Assurance'],
  'End-to-End Testing': ['Software Engineering', 'Quality Assurance'],
  'Design Patterns': ['Software Architecture'],
  'API Design': ['Software Architecture', 'Backend Development'],
  'Object-Oriented Programming': ['Software Engineering'],
  'Systems Programming': ['Software Engineering'],
  'Scripting': ['Software Engineering'],
  'Data Science': ['Data Engineering'],
  'Web Scripting': ['Frontend Development'],
  'Concurrency': ['Software Engineering', 'Backend Development'],
  'Relational Database': ['Database Management'],
};

const SKILL_TO_DOMAIN: Record<string, string[]> = {
  'Frontend Development': ['Web Development'],
  'Backend Development': ['Web Development'],
  'Database Management': ['Data Engineering'],
  'Software Architecture': ['Software Engineering'],
  'Software Engineering': ['Computer Science'],
  'AI/ML Engineering': ['Artificial Intelligence'],
  'Security': ['Cybersecurity'],
  'Cloud Computing': ['Cloud Infrastructure'],
  'DevOps': ['Cloud Infrastructure'],
  'Data Engineering': ['Computer Science'],
  'Quality Assurance': ['Software Engineering'],
};

export const buildKnowledgeGraph = (
  githubStats: IGithubStats | null,
  integrationProfile: IIntegrationProfile | null
): { nodes: IGraphNode[]; edges: IGraphEdge[] } => {
  const nodes: Map<string, IGraphNode> = new Map();
  const edges: IGraphEdge[] = [];

  const addNode = (node: IGraphNode) => {
    if (!nodes.has(node.id)) {
      nodes.set(node.id, node);
    } else {
      const existing = nodes.get(node.id)!;
      existing.properties = { ...existing.properties, ...node.properties };
    }
  };

  const addEdge = (source: string, target: string, relationship: IGraphEdge['relationship'], weight = 1) => {
    const exists = edges.find(e => e.source === source && e.target === target && e.relationship === relationship);
    if (!exists) {
      edges.push({ source, target, relationship, weight });
    } else {
      exists.weight += weight;
    }
  };

  const USER_ID = 'developer:you';
  addNode({ id: USER_ID, label: 'You', type: 'Developer', properties: { confidence: 100 } });

  const techOccurrences: Record<string, { count: number, repos: Set<string> }> = {};

  if (githubStats && githubStats.repositories) {
    githubStats.repositories.forEach(repo => {
      const repoId = `repo:${repo.name}`;
      addNode({
        id: repoId,
        label: repo.name,
        type: 'Repository',
        properties: { stars: repo.stars, forks: repo.forks, confidence: 100 }
      });
      addEdge(USER_ID, repoId, 'OWNS');

      const extractedTechs = new Set<string>();

      // Infer from languages
      const langs = (repo.languages && repo.languages.length > 0) 
        ? repo.languages 
        : (repo.language && repo.language !== 'Unknown' ? [repo.language] : []);
      
      langs.forEach(lang => extractedTechs.add(lang));

      // Infer from dependencies
      if (repo.dependencies) {
        repo.dependencies.forEach(dep => {
          const tech = DEP_TO_TECH[dep.toLowerCase()];
          if (tech) extractedTechs.add(tech);
        });
      }

      // Infer from file paths (architecture, deployment, etc.)
      if (repo.filePaths) {
        repo.filePaths.forEach(path => {
          PATH_TO_TECH.forEach(matcher => {
            if (matcher.regex.test(path)) {
              extractedTechs.add(matcher.tech);
            }
          });
        });
      }

      // Build hierarchy
      extractedTechs.forEach(tech => {
        if (!techOccurrences[tech]) techOccurrences[tech] = { count: 0, repos: new Set() };
        techOccurrences[tech].count += 1;
        techOccurrences[tech].repos.add(repo.name);
        
        const techId = `tech:${tech}`;
        addNode({ id: techId, label: tech, type: 'Technology', properties: {} });
        addEdge(repoId, techId, 'IMPLEMENTS');

        if (TECH_TO_CONCEPT[tech]) {
          TECH_TO_CONCEPT[tech].forEach(concept => {
            const conceptId = `concept:${concept}`;
            addNode({ id: conceptId, label: concept, type: 'Concept' });
            addEdge(techId, conceptId, 'BELONGS_TO');

            if (CONCEPT_TO_SKILL[concept]) {
              CONCEPT_TO_SKILL[concept].forEach(skill => {
                const skillId = `skill:${skill}`;
                addNode({ id: skillId, label: skill, type: 'Skill' });
                addEdge(conceptId, skillId, 'BELONGS_TO');

                if (SKILL_TO_DOMAIN[skill]) {
                  SKILL_TO_DOMAIN[skill].forEach(domain => {
                    const domainId = `domain:${domain}`;
                    addNode({ id: domainId, label: domain, type: 'Domain' });
                    addEdge(skillId, domainId, 'BELONGS_TO');
                  });
                }
              });
            }
          });
        }
      });
    });

    // Refine Confidence Scores based on techOccurrences
    const totalRepos = githubStats.repositories.length || 1;
    for (const [tech, data] of Object.entries(techOccurrences)) {
      const techId = `tech:${tech}`;
      const node = nodes.get(techId);
      if (node) {
        const confidence = Math.min(100, Math.round((data.count / Math.min(5, totalRepos)) * 100));
        const reposArray = Array.from(data.repos);
        const reasonRepos = reposArray.slice(0, 3).join(', ') + (reposArray.length > 3 ? ` and ${reposArray.length - 3} more` : '');
        node.properties = { ...node.properties, confidence, reason: `Found in ${reasonRepos}` };
      }
    }
  }

  // Bubble up confidence through the hierarchy
  const propagateConfidence = (childType: string, parentType: string, rel: string) => {
    const parentConfidence: Record<string, { total: number, count: number, repos: Set<string> }> = {};
    
    edges.filter(e => e.relationship === rel).forEach(edge => {
      const child = nodes.get(edge.source);
      const parent = nodes.get(edge.target);
      if (child && parent && child.type === childType && parent.type === parentType) {
        const conf = child.properties?.confidence || 50;
        
        if (!parentConfidence[parent.id]) parentConfidence[parent.id] = { total: 0, count: 0, repos: new Set() };
        parentConfidence[parent.id].total += conf;
        parentConfidence[parent.id].count += 1;
        
        // Propagate repos to reason about domain/skill
        const reasonMatch = child.properties?.reason?.match(/Found in (.*)/);
        if (reasonMatch) {
          reasonMatch[1].split(', ').forEach((r: string) => parentConfidence[parent.id].repos.add(r.trim()));
        }
      }
    });

    for (const [parentId, data] of Object.entries(parentConfidence)) {
      const parent = nodes.get(parentId);
      if (parent) {
        const avgConf = Math.min(100, Math.round(data.total / data.count) + 15 * (data.count - 1));
        const reposArray = Array.from(data.repos);
        const reason = reposArray.length > 0 ? `Inferred from architectures in ${reposArray.slice(0, 3).join(', ')}` : `Inferred from ${data.count} underlying items`;
        parent.properties = { ...parent.properties, confidence: avgConf, reason };
      }
    }
  };

  propagateConfidence('Technology', 'Concept', 'BELONGS_TO');
  propagateConfidence('Concept', 'Skill', 'BELONGS_TO');
  propagateConfidence('Skill', 'Domain', 'BELONGS_TO');

  nodes.forEach(node => {
    if (node.type === 'Skill' || node.type === 'Domain') {
      if ((node.properties?.confidence || 0) > 30) {
        addEdge(USER_ID, node.id, 'HAS_SKILL');
      }
    }
  });

  if (integrationProfile && integrationProfile.leetcodeStats) {
    const dsaId = 'skill:Data Structures & Algorithms';
    const domainId = 'domain:Computer Science';
    addNode({ id: dsaId, label: 'Data Structures & Algorithms', type: 'Skill', properties: { confidence: 90, reason: 'Verified via LeetCode stats' } });
    addNode({ id: domainId, label: 'Computer Science', type: 'Domain', properties: { confidence: 85 } });
    addEdge(USER_ID, dsaId, 'HAS_SKILL');
    addEdge(dsaId, domainId, 'BELONGS_TO');
    addEdge(USER_ID, domainId, 'HAS_SKILL');

    const stats = integrationProfile.leetcodeStats;
    if (stats.solvedEasy > 0) {
      addNode({ id: 'topic:Basic Algorithms', label: 'Basic Algorithms', type: 'Topic', properties: { confidence: 100 } });
      addEdge(dsaId, 'topic:Basic Algorithms', 'IMPROVES');
    }
    if (stats.solvedMedium > 0) {
      addNode({ id: 'topic:Intermediate Algorithms', label: 'Intermediate Algorithms', type: 'Topic', properties: { confidence: 80 } });
      addEdge(dsaId, 'topic:Intermediate Algorithms', 'IMPROVES');
    }
    if (stats.solvedHard > 0) {
      addNode({ id: 'topic:Advanced Algorithms', label: 'Advanced Algorithms', type: 'Topic', properties: { confidence: 70 } });
      addEdge(dsaId, 'topic:Advanced Algorithms', 'IMPROVES');
    }
    if (stats.badges > 0) {
      addNode({ id: 'achievement:LeetCode Badges', label: 'LeetCode Badges', type: 'Achievement', properties: { confidence: 100 } });
      addEdge('achievement:LeetCode Badges', dsaId, 'RELATED_TO');
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges
  };
};

export const getGraphBasedRecommendations = (nodes: IGraphNode[], edges: IGraphEdge[]): string[] => {
  const recommendations = new Set<string>();

  const knownTechIds = nodes.filter(n => n.type === 'Technology' && (n.properties?.confidence || 0) > 30).map(n => n.id);
  const knownSkillIds = nodes.filter(n => n.type === 'Skill' && (n.properties?.confidence || 0) > 30).map(n => n.id);
  const knows = (tech: string) => knownTechIds.includes(`tech:${tech}`);

  if (knownTechIds.length === 0) {
    return ['Connect GitHub repositories and push architectural code to get recommendations.'];
  }

  // Next-Level recommendation logic (based on missing tools when foundations are met)
  if (knows('React') && knows('Express') && knows('MongoDB') && knows('REST APIs')) {
    if (!knows('Redis')) recommendations.add('You have mastered the MERN stack! Next, learn Redis for performance optimization and caching.');
    if (!knows('GraphQL')) recommendations.add('Consider moving beyond REST APIs by learning GraphQL for more efficient data querying.');
    if (!knows('Docker')) recommendations.add('Your full-stack architecture is solid. Learn Docker to containerize your applications.');
  }

  if (knows('Docker') && !knows('Kubernetes') && !knows('Docker Compose')) {
    recommendations.add('Since you know Docker, explore Kubernetes or Docker Compose to orchestrate microservices.');
  }

  if (knows('React') && !knows('Zustand') && !knows('Redux')) {
    recommendations.add('Level up your React architecture by implementing advanced state management with Zustand or Redux.');
  }

  if (knows('Express') && knows('MongoDB') && !knows('Prisma')) {
    recommendations.add('Improve your database access layer by adopting an ORM like Prisma.');
  }

  if ((knows('React') || knows('Express')) && !knows('GitHub Actions') && !knows('CI/CD')) {
    recommendations.add('Automate your deployment pipeline by learning GitHub Actions or other CI/CD tools.');
  }

  if (knows('Python') && knows('FastAPI') && !knows('LangChain') && !knows('Ollama')) {
    recommendations.add('Your Python backend skills are great. Explore LangChain or Ollama to integrate Generative AI capabilities.');
  }

  const allSkills = nodes.filter(n => n.type === 'Skill');
  allSkills.forEach(skill => {
    if (knownSkillIds.includes(skill.id) && recommendations.size < 4) {
      const relatedConcepts = Object.keys(CONCEPT_TO_SKILL).filter(c => CONCEPT_TO_SKILL[c].includes(skill.label));
      
      relatedConcepts.forEach(concept => {
        const conceptId = `concept:${concept}`;
        const hasConcept = nodes.find(n => n.id === conceptId && (n.properties?.confidence || 0) > 30);
        
        if (!hasConcept) {
          const techForConcept = Object.keys(TECH_TO_CONCEPT).find(t => TECH_TO_CONCEPT[t].includes(concept));
          if (techForConcept && !knows(techForConcept)) {
            recommendations.add(`Learn ${techForConcept} to master ${concept} within ${skill.label}.`);
          }
        }
      });
    }
  });

  if (recommendations.size === 0) {
    recommendations.add('Your architectural graph is highly advanced! Consider exploring System Design, Microservices, or deep AI integrations.');
  }

  return Array.from(recommendations).slice(0, 3);
};
