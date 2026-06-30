import React from 'react';
import GithubStatsWidget from '../components/GithubStatsWidget';
import LeetCodeStatsWidget from '../components/LeetCodeStatsWidget';
import DeveloperIntelligenceWidget from '../components/DeveloperIntelligenceWidget';
import KnowledgeGraphWidget from '../components/KnowledgeGraphWidget';

export interface Widget {
  id: string;
  component: React.FC;
  region?: 'full' | 'sidebar';
}

export const WidgetRegistry: Widget[] = [
  { id: 'developer-intelligence', component: DeveloperIntelligenceWidget, region: 'full' },
  { id: 'knowledge-graph', component: KnowledgeGraphWidget, region: 'full' },
  { id: 'github-stats', component: GithubStatsWidget, region: 'sidebar' },
  { id: 'leetcode-stats', component: LeetCodeStatsWidget, region: 'sidebar' },
];
