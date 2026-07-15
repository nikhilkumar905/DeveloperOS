import { IGithubStats } from '../models/GithubStats';
import { IIntegrationProfile } from '../models/IntegrationProfile';
import { buildKnowledgeGraph, getGraphBasedRecommendations } from './knowledgeGraphEngine';
import axios from 'axios';

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

export const calculateDeveloperIntelligence = async (
  githubStats: IGithubStats | null,
  integrationProfile: IIntegrationProfile | null
): Promise<CalculationResult> => {
  const graph = buildKnowledgeGraph(githubStats, integrationProfile);
  const nodes = graph.nodes;

  // Helper to extract confidence of a specific skill node
  const getConfidence = (label: string, type: string): number => {
    const node = nodes.find(n => n.label === label && n.type === type);
    return node?.properties?.confidence || 0;
  };

  // 1. Core Domain Scores (from Knowledge Graph)
  let frontendScore = getConfidence('Frontend Development', 'Skill');
  let backendScore = getConfidence('Backend Development', 'Skill');
  let dsaScore = getConfidence('Data Structures & Algorithms', 'Skill');
  let databaseScore = getConfidence('Database Management', 'Skill');
  let devopsScore = getConfidence('DevOps', 'Skill');
  let cloudScore = getConfidence('Cloud Computing', 'Skill');
  let securityScore = getConfidence('Security', 'Skill');
  let aiMlScore = getConfidence('AI/ML Engineering', 'Skill');

  let fullStackScore = Math.round((frontendScore + backendScore) / 2);

  // 2. Productivity Score — uses real commit/PR/issue data from GithubStats
  let productivityScore = 0;
  if (githubStats) {
    const { totalCommits, totalPRs, totalIssues } = githubStats.aggregatedStats;
    const repoCount = githubStats.repositories?.length || 0;
    const commitProxy = totalCommits > 0 ? totalCommits : repoCount * 5;
    const productivityPoints = commitProxy * 1 + totalPRs * 10 + totalIssues * 5;
    productivityScore = Math.min(100, Math.round((productivityPoints / 300) * 100));
  }

  // 3. Consistency Score
  const lcStreak = integrationProfile?.leetcodeStats?.streak || 0;
  const lcSolved = integrationProfile?.leetcodeStats?.solvedTotal || 0;
  const streakScore = Math.min(50, Math.round((lcStreak / 30) * 50));
  const solvedScore = Math.min(30, Math.round((lcSolved / 200) * 30));
  const productivityBonus = Math.round(productivityScore * 0.2);
  const consistencyScore = Math.min(100, streakScore + solvedScore + productivityBonus);

  // 4. Interview Readiness
  let interviewReadiness = Math.min(100, Math.round(
    dsaScore * 0.45 + fullStackScore * 0.30 + consistencyScore * 0.25
  ));

  // 5. Overall Score
  let domainAvg = (frontendScore + backendScore + databaseScore + devopsScore + aiMlScore + cloudScore + securityScore + dsaScore) / 8;
  let overallScore = Math.min(100, Math.round((domainAvg * 0.5 + consistencyScore * 0.25 + productivityScore * 0.25)));

  let strengths: string[] = [];
  let weaknesses: string[] = [];
  let recommendations: string[] = [];
  let roadmap: string[] = [];

  // Attempt to use Groq LLM for personalized insights and accurate domain scoring
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      let repoSummary = 'No repositories found.';
      if (githubStats && githubStats.repositories && githubStats.repositories.length > 0) {
        repoSummary = githubStats.repositories.slice(0, 15).map(r => 
          `- ${r.name} (${r.language || 'Unknown'}): ${r.description || 'No description'} (Stars: ${r.stars || 0})`
        ).join('\n');
      }

      const prompt = `You are an expert technical mentor evaluating a software developer's profile.
Analyze the following developer data and their actual GitHub repositories to score their skills out of 100.
Do not rely blindly on the "Baseline Scores", re-evaluate them based on their projects!
For example, if you see a machine learning project like "ai code translator", give a high AI/ML score even if the baseline is 0.

Current Baseline Scores (may be inaccurate, use as a baseline only):
- DSA: ${dsaScore}/100
- Frontend: ${frontendScore}/100
- Backend: ${backendScore}/100
- DevOps: ${devopsScore}/100
- AI/ML: ${aiMlScore}/100
- Database: ${databaseScore}/100
- Security: ${securityScore}/100
- Cloud: ${cloudScore}/100

Developer Activity (Keep Productivity & Consistency as these are deterministic):
- GitHub Total Commits: ${githubStats?.aggregatedStats?.totalCommits || 0}
- LeetCode Solved: ${lcSolved}
- Consistency Score: ${consistencyScore}/100
- Productivity Score: ${productivityScore}/100

GitHub Repositories:
${repoSummary}

Based on this deep analysis of their repositories and activity, provide highly personalized and constructive feedback, AND output your newly calculated scores for each domain.

Output exactly a JSON object with the following keys:
- "scores": An object containing integer scores (0-100) for these keys: "dsa", "frontend", "backend", "fullStack", "devops", "aiMl", "database", "security", "cloud".
- "strengths": An array of 3-4 strings detailing their strongest areas.
- "weaknesses": An array of 2-3 strings detailing areas of improvement.
- "recommendations": An array of 2-3 strings providing actionable advice for career or skill growth.
- "roadmap": An array of 3-4 strings describing the next steps they should take in their learning journey.

Output ONLY a valid JSON object.`;

      const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }, {
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const content = response.data.choices[0].message.content.trim();
      const parsed = JSON.parse(content);
      
      if (parsed.scores) {
        dsaScore = parsed.scores.dsa ?? dsaScore;
        frontendScore = parsed.scores.frontend ?? frontendScore;
        backendScore = parsed.scores.backend ?? backendScore;
        fullStackScore = parsed.scores.fullStack ?? fullStackScore;
        devopsScore = parsed.scores.devops ?? devopsScore;
        aiMlScore = parsed.scores.aiMl ?? aiMlScore;
        databaseScore = parsed.scores.database ?? databaseScore;
        securityScore = parsed.scores.security ?? securityScore;
        cloudScore = parsed.scores.cloud ?? cloudScore;
        
        // Recalculate derived scores with the new domain scores
        domainAvg = (frontendScore + backendScore + databaseScore + devopsScore + aiMlScore + cloudScore + securityScore + dsaScore) / 8;
        overallScore = Math.min(100, Math.round((domainAvg * 0.5 + consistencyScore * 0.25 + productivityScore * 0.25)));
        interviewReadiness = Math.min(100, Math.round(dsaScore * 0.45 + fullStackScore * 0.30 + consistencyScore * 0.25));
      }

      strengths = parsed.strengths || [];
      weaknesses = parsed.weaknesses || [];
      recommendations = parsed.recommendations || [];
      roadmap = parsed.roadmap || [];
    }
  } catch (error) {
    console.error('Groq LLM analytics generation failed, falling back to static heuristics.', error);
  }

  // Fallback to static heuristic if LLM fails or is empty
  if (strengths.length === 0 && weaknesses.length === 0) {
    roadmap = getGraphBasedRecommendations(graph.nodes, graph.edges);

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
