import { IGithubStats } from '../models/GithubStats';
import { IIntegrationProfile } from '../models/IntegrationProfile';
import { buildKnowledgeGraph, getGraphBasedRecommendations } from './knowledgeGraphEngine';

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
  const graph = buildKnowledgeGraph(githubStats, integrationProfile);
  const nodes = graph.nodes;

  // Helper to extract confidence of a specific skill node
  const getConfidence = (label: string, type: string): number => {
    const node = nodes.find(n => n.label === label && n.type === type);
    return node?.properties?.confidence || 0;
  };

  // 1. Core Domain Scores (from Knowledge Graph)
  const frontendScore = getConfidence('Frontend Development', 'Skill');
  const backendScore = getConfidence('Backend Development', 'Skill');
  const dsaScore = getConfidence('Data Structures & Algorithms', 'Skill');
  const databaseScore = getConfidence('Database Management', 'Skill');
  const devopsScore = getConfidence('DevOps', 'Skill');
  const cloudScore = getConfidence('Cloud Computing', 'Skill');
  const securityScore = getConfidence('Security', 'Skill');
  const aiMlScore = getConfidence('AI/ML Engineering', 'Skill');

  const fullStackScore = Math.round((frontendScore + backendScore) / 2);

  // 2. Productivity Score — uses real commit/PR/issue data from GithubStats
  let productivityScore = 0;
  if (githubStats) {
    const { totalCommits, totalPRs, totalIssues } = githubStats.aggregatedStats;
    const repoCount = githubStats.repositories?.length || 0;

    // Commits carry most weight; use repo count as a baseline signal
    // when totalCommits is still 0 (GitHub API limitation)
    const commitProxy = totalCommits > 0 ? totalCommits : repoCount * 5;
    const productivityPoints = commitProxy * 1 + totalPRs * 10 + totalIssues * 5;
    // Scale: 300 points = 100 score (30 repos, 0 PRs, 0 issues)
    productivityScore = Math.min(100, Math.round((productivityPoints / 300) * 100));
  }

  // 3. Consistency Score — driven by LeetCode streak + coding activity
  const lcStreak = integrationProfile?.leetcodeStats?.streak || 0;
  const lcSolved = integrationProfile?.leetcodeStats?.solvedTotal || 0;
  const streakScore = Math.min(50, Math.round((lcStreak / 30) * 50));
  const solvedScore = Math.min(30, Math.round((lcSolved / 200) * 30));
  const productivityBonus = Math.round(productivityScore * 0.2);
  const consistencyScore = Math.min(100, streakScore + solvedScore + productivityBonus);

  // 4. Interview Readiness
  const interviewReadiness = Math.min(100, Math.round(
    dsaScore * 0.45 + fullStackScore * 0.30 + consistencyScore * 0.25
  ));

  // 5. Overall Score
  const domainAvg = (frontendScore + backendScore + databaseScore + devopsScore + aiMlScore + cloudScore + securityScore + dsaScore) / 8;
  const overallScore = Math.min(100, Math.round((domainAvg * 0.5 + consistencyScore * 0.25 + productivityScore * 0.25)));

  // 6. Strengths & Weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  const roadmap: string[] = getGraphBasedRecommendations(graph.nodes, graph.edges);

  if (dsaScore > 80) strengths.push('Strong Data Structures & Algorithms');
  else if (dsaScore < 30 && lcSolved < 50) weaknesses.push('Needs improvement in DSA (solve more LeetCode problems)');

  if (frontendScore > 75) strengths.push('Solid Frontend Engineering');
  if (backendScore > 75) strengths.push('Solid Backend Engineering');
  if (fullStackScore > 70) strengths.push('Well-rounded Full-Stack Developer');
  if (aiMlScore > 60) strengths.push('AI/ML Expertise');
  if (devopsScore > 60) strengths.push('DevOps & Infrastructure Skills');
  if (cloudScore > 60) strengths.push('Cloud Platform Experience');
  if (databaseScore > 70) strengths.push('Strong Database Engineering');

  if (frontendScore < 20 && backendScore < 20) {
    weaknesses.push('Low coding volume detected — connect GitHub to get accurate scores');
  }

  if (lcStreak > 30) strengths.push('Highly consistent — maintained a long coding streak');
  else if (lcStreak < 5) weaknesses.push('Inconsistent coding practice — aim for daily LeetCode sessions');

  if (interviewReadiness > 80) {
    recommendations.push('You are highly ready for technical interviews at top tech companies!');
  } else if (interviewReadiness > 50) {
    recommendations.push('Moderately interview-ready. Focus on hard DSA problems and system design.');
  } else {
    recommendations.push('Build your foundation: solve at least 100 LeetCode problems and push to GitHub regularly.');
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
    roadmap,
  };
};
