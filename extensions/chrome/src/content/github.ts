/**
 * GitHub Content Script
 * Detects: repo visits, code views, PR/issue views, profile views
 */

import { ActivityEvent, ActivityType } from '../types';

const sendEvent = (event: ActivityEvent): void => {
  chrome.runtime.sendMessage({ type: 'ACTIVITY_EVENT', event });
};

const buildEvent = (
  activityType: ActivityType,
  metadata: ActivityEvent['metadata'],
  duration = 0
): ActivityEvent => ({
  platform: 'github',
  activityType,
  metadata: {
    url: window.location.href,
    title: document.title,
    ...metadata,
  },
  duration,
  timestamp: new Date().toISOString(),
});

// ─── Parse GitHub URL ──────────────────────────────────────────────────────────

interface GithubUrlInfo {
  owner?: string;
  repo?: string;
  type: 'profile' | 'repo' | 'code' | 'pr' | 'issue' | 'other';
}

const parseGithubUrl = (url: string): GithubUrlInfo => {
  const path = new URL(url).pathname.replace(/^\//, '').split('/');
  const [owner, repo, section] = path;

  if (!owner) return { type: 'other' };
  if (!repo) return { owner, type: 'profile' };

  if (section === 'blob' || section === 'tree') return { owner, repo, type: 'code' };
  if (section === 'pull' || section === 'pulls') return { owner, repo, type: 'pr' };
  if (section === 'issues' || section === 'issue') return { owner, repo, type: 'issue' };

  return { owner, repo, type: 'repo' };
};

// ─── Page Entry Time Tracking ─────────────────────────────────────────────────

const entryTime = Date.now();

const reportActivity = () => {
  const duration = Date.now() - entryTime;
  if (duration < 3000) return; // ignore accidental clicks < 3 seconds

  const info = parseGithubUrl(window.location.href);

  let activityType: ActivityType;
  switch (info.type) {
    case 'code':    activityType = 'repo_code_view'; break;
    case 'pr':      activityType = 'pr_view'; break;
    case 'issue':   activityType = 'issue_view'; break;
    case 'profile': activityType = 'profile_view'; break;
    case 'repo':    activityType = 'repo_visit'; break;
    default:        return;
  }

  sendEvent(buildEvent(activityType, {
    repoOwner: info.owner,
    repoName: info.repo,
  }, duration));
};

// Report on page unload / tab close
window.addEventListener('pagehide', reportActivity);
window.addEventListener('beforeunload', reportActivity);

// Also report after 30 seconds if still on page (long reading sessions)
setTimeout(() => {
  const info = parseGithubUrl(window.location.href);
  if (info.type === 'code' || info.type === 'repo') {
    sendEvent(buildEvent(info.type === 'code' ? 'repo_code_view' : 'repo_visit', {
      repoOwner: info.owner,
      repoName: info.repo,
    }, 30000));
  }
}, 30000);
