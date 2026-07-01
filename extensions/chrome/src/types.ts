// Shared types for the PersonalOS browser extension

export type Platform =
  | 'github'
  | 'leetcode'
  | 'hackerrank'
  | 'codeforces'
  | 'geeksforgeeks'
  | 'stackoverflow'
  | 'docs'
  | 'other';

export type ActivityType =
  | 'repo_visit'
  | 'repo_code_view'
  | 'repo_push'
  | 'repo_commit_view'
  | 'problem_view'
  | 'problem_solved'
  | 'problem_attempted'
  | 'article_read'
  | 'docs_read'
  | 'profile_view'
  | 'question_view'
  | 'answer_view'
  | 'contest_participated'
  | 'pr_view'
  | 'issue_view'
  | 'coding_session';

export interface ActivityMetadata {
  url?: string;
  title?: string;
  repoName?: string;
  repoOwner?: string;
  problemName?: string;
  problemSlug?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  language?: string;
  tags?: string[];
  contestName?: string;
  score?: number;
}

export interface ActivityEvent {
  platform: Platform;
  activityType: ActivityType;
  metadata: ActivityMetadata;
  duration: number; // ms
  timestamp: string; // ISO string
}

export interface ExtensionSettings {
  token: string;                    // PersonalOS JWT token
  backendUrl: string;               // e.g. http://localhost:6500
  platforms: Record<Platform, boolean>; // per-platform enabled/disabled
  lastSync: string | null;          // ISO timestamp of last successful sync
}

export interface PopupState {
  isConnected: boolean;
  todayStats: {
    totalTimeMs: number;
    problemsSolved: number;
    streak: number;
    platforms: string[];
  } | null;
  settings: ExtensionSettings;
  pendingCount: number;
}

// Messages sent between content scripts, background, and popup
export type MessageType =
  | { type: 'ACTIVITY_EVENT'; event: ActivityEvent }
  | { type: 'GET_SETTINGS' }
  | { type: 'SETTINGS_RESPONSE'; settings: ExtensionSettings }
  | { type: 'GET_STATS' }
  | { type: 'STATS_RESPONSE'; stats: PopupState['todayStats'] }
  | { type: 'SYNC_NOW' }
  | { type: 'SYNC_COMPLETE'; count: number }
  | { type: 'GET_PENDING_COUNT' }
  | { type: 'PENDING_COUNT_RESPONSE'; count: number };
