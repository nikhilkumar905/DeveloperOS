import { Request, Response } from 'express';
import KnowledgeGraph from '../models/KnowledgeGraph';
import { GithubStats } from '../models/GithubStats';
import IntegrationProfile from '../models/IntegrationProfile';
import { buildKnowledgeGraph } from '../services/knowledgeGraphEngine';

// @desc    Get Developer Knowledge Graph
// @route   GET /api/graph
// @access  Private
export const getGraph = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;

    // Check if we have a recent graph
    let graph = await KnowledgeGraph.findOne({ user: userId });
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const now = new Date();

    if (
      graph &&
      graph.lastUpdated &&
      (now.getTime() - graph.lastUpdated.getTime()) < TWENTY_FOUR_HOURS
    ) {
      return res.json(graph);
    }

    // Build the graph
    const githubStats = await GithubStats.findOne({ user: userId });
    const integrationProfile = await IntegrationProfile.findOne({ user: userId });

    const graphData = buildKnowledgeGraph(githubStats, integrationProfile);

    if (graph) {
      graph.nodes = graphData.nodes;
      graph.edges = graphData.edges;
      graph.lastUpdated = now;
      await graph.save();
    } else {
      graph = await KnowledgeGraph.create({
        user: userId,
        nodes: graphData.nodes,
        edges: graphData.edges,
        lastUpdated: now,
      });
    }

    res.json(graph);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
