import { IGithubStats } from '../models/GithubStats';
import { IIntegrationProfile } from '../models/IntegrationProfile';
import { buildKnowledgeGraph, getGraphBasedRecommendations } from './knowledgeGraphEngine';
import { IGraphNode } from '../models/KnowledgeGraph';

interface CalculationResult {
  scores: {
    dsa: number;
    frontend: number;
    backend: number;
    fullStack: number;
    consistency: number;
    productivity: number;
    interviewReadiness: number;
    overallScore: number;
    database?: number;
    devops?: number;
    aiMl?: number;
    security?: number;
    cloud?: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  roadmap: string[];
}

export const calculateDeveloperIntelligence = (
  githubStats: IGithubStats | null,
  integrationProfile: IIntegrationProfile | null
): CalculationResult => {
  // Construct the graph to base all calculations off of it
  const graph = buildKnowledgeGraph(githubStats, integrationProfile);
  const nodes = graph.nodes;
  
  // Helper to extract confidence of a specific skill or domain
  const getConfidence = (label: string, type: string) => {
    const node = nodes.find(n => n.label === label && n.type === type);
    return node?.properties?.confidence || 0;
  };

  // 1. Core Domains & Skills
  const frontendScore = getConfidence('Frontend Development', 'Skill');
  const backendScore = getConfidence('Backend Development', 'Skill');
  const dsaScore = getConfidence('Data Structures & Algorithms', 'Skill');
  const databaseScore = getConfidence('Database Management', 'Skill');
  const devopsScore = getConfidence('DevOps', 'Skill');
  const cloudScore = getConfidence('Cloud Computing', 'Skill');
  const securityScore = getConfidence('Security', 'Skill');
  const aiMlScore = getConfidence('AI/ML Engineering', 'Skill');

  const fullStackScore = Math.round((frontendScore + backendScore) / 2);

  // 2. Productivity & Consistency
  let productivityScore = 0;
  let consistencyScore = 0;
  
  if (githubStats) {
    const { totalCommits, totalPRs, totalIssues } = githubStats.aggregatedStats;
    const productivityPoints = totalCommits * 1 + totalPRs * 10 + totalIssues * 5;
    productivityScore = Math.min(100, Math.round((productivityPoints / 200) * 100)); 
  }

  const lcStreak = integrationProfile?.leetcodeStats?.streak || 0;
  consistencyScore = Math.min(100, Math.round((lcStreak / 30) * 50 + (productivityScore * 0.5)));

  // 3. Interview Readiness & Overall
  const interviewReadiness = Math.round((dsaScore * 0.5) + (fullStackScore * 0.3) + (consistencyScore * 0.2));
  
  const totalSkillAvg = (frontendScore + backendScore + databaseScore + devopsScore + aiMlScore + cloudScore + securityScore + dsaScore) / 8;
  const overallScore = Math.round((totalSkillAvg + consistencyScore + productivityScore) / 3);

  // 4. Strengths & Weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  const roadmap: string[] = getGraphBasedRecommendations(graph.nodes, graph.edges);

  if (dsaScore > 80) strengths.push('Strong Data Structures & Algorithms');
  else if (dsaScore < 30) weaknesses.push('Needs improvement in DSA');

  if (frontendScore > 75) strengths.push('Solid Frontend Engineering');
  if (backendScore > 75) strengths.push('Solid Backend Engineering');
  if (aiMlScore > 60) strengths.push('AI/ML Expertise');
  if (devopsScore > 60) strengths.push('DevOps & Infrastructure Skills');

  if (frontendScore < 20 && backendScore < 20) {
    weaknesses.push('Low coding volume in core web technologies');
  }
  
  if (consistencyScore > 80) strengths.push('Highly consistent developer');
  if (consistencyScore < 40) weaknesses.push('Inconsistent coding habits');

  if (interviewReadiness > 80) {
    recommendations.push('You are highly ready for technical interviews at top tech companies!');
  } else if (interviewReadiness > 50) {
    recommendations.push('You are moderately ready. Focus on mastering hard DSA problems and system design.');
  }

  return {
    scores: {
      dsa: dsaScore,
      frontend: frontendScore,
      backend: backendScore,
      fullStack: fullStackScore,
      consistency: consistencyScore,
      productivity: productivityScore,
      interviewReadiness,
      overallScore,
      database: databaseScore,
      devops: devopsScore,
      aiMl: aiMlScore,
      security: securityScore,
      cloud: cloudScore,
    },
    strengths,
    weaknesses,
    recommendations,
    roadmap
  };
};
