/**
 * GitHub Content Script — PersonalOS
 * Detects: repo visits, code views, PR/issue views, profile views,
 *          commits page visits (after a push), and push result banners.
 *
 * GitHub is a Turbo/SPA app — it updates the URL via history.pushState
 * without a full page reload. This script hooks pushState to detect
 * navigation and re-evaluate activity on each new page.
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

// ─── Parse GitHub URL ───────────────────────────────────────────────────────

interface GithubUrlInfo {
  owner?: string;
  repo?: string;
  type: 'profile' | 'repo' | 'code' | 'pr' | 'issue' | 'commits' | 'commit' | 'compare' | 'other';
}

const parseGithubUrl = (url: string): GithubUrlInfo => {
  try {
    const path = new URL(url).pathname.replace(/^\//, '').split('/');
    const [owner, repo, section, , sub] = path;

    if (!owner) return { type: 'other' };
    if (!repo) return { owner, type: 'profile' };

    // commits page = someone just pushed
    if (section === 'commits') return { owner, repo, type: 'commits' };
    // single commit detail
    if (section === 'commit') return { owner, repo, type: 'commit' };
    // compare = someone is preparing a push / comparing branches
    if (section === 'compare') return { owner, repo, type: 'compare' };

    if (section === 'blob' || section === 'tree' || section === 'edit') return { owner, repo, type: 'code' };
    if (section === 'pull' || section === 'pulls') return { owner, repo, type: 'pr' };
    if (section === 'issues' || section === 'issue') return { owner, repo, type: 'issue' };

    return { owner, repo, type: 'repo' };
  } catch {
    return { type: 'other' };
  }
};

// ─── Activity Tracking Per Page ─────────────────────────────────────────────

// Track which pages we've already reported so we don't double-count
const reportedUrls = new Set<string>();
let pageEntryTime = Date.now();

const reportCurrentPage = () => {
  const url = window.location.href;
  if (reportedUrls.has(url)) return;
  reportedUrls.add(url);

  const info = parseGithubUrl(url);
  const duration = Date.now() - pageEntryTime;
  const base = { repoOwner: info.owner, repoName: info.repo };

  switch (info.type) {
    case 'commits':
    case 'compare':
      // User is viewing commits after a push → log as repo_push
      sendEvent(buildEvent('repo_push', { ...base }, duration));
      break;
    case 'commit':
      sendEvent(buildEvent('repo_commit_view', { ...base }, duration));
      break;
    case 'pr':
      sendEvent(buildEvent('pr_view', { ...base }, duration));
      break;
    case 'issue':
      sendEvent(buildEvent('issue_view', { ...base }, duration));
      break;
    default:
      return;
  }
};

// ─── Detect Push Banner ──────────────────────────────────────────────────────
// After `git push`, GitHub shows a "Your branch has been pushed" flash banner.
// We detect it via MutationObserver on the flash container.

let hasFiredPushBanner = false;

const observePushBanner = () => {
  const observer = new MutationObserver(() => {
    if (hasFiredPushBanner) return;

    // GitHub uses `.js-flash-template`, `.flash`, or `.flash-full` for banners
    const banners = document.querySelectorAll('.js-flash-template, .flash, [class*="flash"]');
    for (const banner of Array.from(banners)) {
      const text = banner.textContent?.toLowerCase() || '';
      if (
        text.includes('pushed') ||
        text.includes('push') ||
        text.includes('branch') ||
        (text.includes('compare') && text.includes('pull request'))
      ) {
        hasFiredPushBanner = true;
        const info = parseGithubUrl(window.location.href);
        sendEvent(buildEvent('repo_push', {
          repoOwner: info.owner,
          repoName: info.repo,
          title: document.title,
        }, 0));
        observer.disconnect();
        break;
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
};

// ─── SPA Navigation Hook ─────────────────────────────────────────────────────
// GitHub uses Turbo (history.pushState) for navigation. The content script
// only runs once on the initial page load, so we intercept pushState to catch
// every SPA navigation.

const hookHistoryNavigation = () => {
  let lastHref = window.location.href;

  // Content scripts cannot safely override history.pushState in the main world.
  // We use a robust polling approach to detect SPA navigation changes.
  setInterval(() => {
    if (window.location.href !== lastHref) {
      lastHref = window.location.href;
      pageEntryTime = Date.now();
      reportCurrentPage();
    }
  }, 1000);

  // Also hook popstate (browser back/forward)
  window.addEventListener('popstate', () => {
    setTimeout(() => {
      lastHref = window.location.href;
      pageEntryTime = Date.now();
      reportCurrentPage();
    }, 400);
  });
};

// ─── Initialise ─────────────────────────────────────────────────────────────

// Report the initial page load after a short delay so the DOM can paint
setTimeout(() => {
  pageEntryTime = Date.now();
  reportCurrentPage();
}, 2000);

hookHistoryNavigation();
observePushBanner();
