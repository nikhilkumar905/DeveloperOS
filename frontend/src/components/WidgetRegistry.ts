import React from 'react';
import GithubStatsWidget from '../components/GithubStatsWidget';
import LeetCodeStatsWidget from '../components/LeetCodeStatsWidget';
import GfgStatsWidget from '../components/GfgStatsWidget';
import DeveloperIntelligenceWidget from '../components/DeveloperIntelligenceWidget';
import KnowledgeGraphWidget from '../components/KnowledgeGraphWidget';

export interface Widget {
  id: string;
  component: React.FC;
  // full: full-width stack; profiles: the coding-platform row (side by side)
  region?: 'full' | 'profiles';
}

export const WidgetRegistry: Widget[] = [
  { id: 'developer-intelligence', component: DeveloperIntelligenceWidget, region: 'full' },
  { id: 'knowledge-graph', component: KnowledgeGraphWidget, region: 'full' },
  { id: 'github-stats', component: GithubStatsWidget, region: 'profiles' },
  { id: 'leetcode-stats', component: LeetCodeStatsWidget, region: 'profiles' },
  { id: 'gfg-stats', component: GfgStatsWidget, region: 'profiles' },
];
