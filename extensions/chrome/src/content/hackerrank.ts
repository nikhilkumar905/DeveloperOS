/**
 * HackerRank Content Script
 * Detects: challenge views, submissions, contest participation
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
  platform: 'hackerrank',
  activityType,
  metadata: { url: window.location.href, title: document.title, ...metadata },
  duration,
  timestamp: new Date().toISOString(),
});

const entryTime = Date.now();

const isProblemPage = (): boolean =>
  /\/challenges\/[^/]+\/problem/.test(window.location.pathname);

const getChallengeName = (): string => {
  const h = document.querySelector('h1.challenge-name') ||
    document.querySelector('.challenge_problem_title') ||
    document.querySelector('h1');
  return h?.textContent?.trim() || document.title;
};

// Initial detection
if (isProblemPage()) {
  setTimeout(() => {
    sendEvent(buildEvent('problem_view', {
      problemName: getChallengeName(),
    }, Date.now() - entryTime));
  }, 2000);
}

// Watch for successful submission dialog
const observer = new MutationObserver(() => {
  const successEl = document.querySelector('.hr-monaco-result-success') ||
    document.querySelector('[class*="success"]');
  if (successEl && isProblemPage()) {
    sendEvent(buildEvent('problem_solved', {
      problemName: getChallengeName(),
    }, Date.now() - entryTime));
    observer.disconnect();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('pagehide', () => {
  const duration = Date.now() - entryTime;
  if (isProblemPage() && duration > 10000) {
    sendEvent(buildEvent('problem_view', {
      problemName: getChallengeName(),
    }, duration));
  }
});
