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

let entryTime = Date.now();
let hasReportedSolved = false;

const getCappedDuration = (): number => {
  const dur = Date.now() - entryTime;
  entryTime = Date.now();
  return Math.min(dur, 60 * 60 * 1000);
};

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
    }, getCappedDuration()));
  }, 2000);
}

// Watch for successful submission dialog
const observer = new MutationObserver(() => {
  if (hasReportedSolved) return;
  const successEl = document.querySelector('.hr-monaco-result-success') ||
    document.querySelector('[class*="success"]');
  if (successEl && isProblemPage() && !hasReportedSolved) {
    hasReportedSolved = true;
    sendEvent(buildEvent('problem_solved', {
      problemName: getChallengeName(),
    }, getCappedDuration()));
    observer.disconnect();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('pagehide', () => {
  if (isProblemPage() && !hasReportedSolved) {
    const dur = getCappedDuration();
    if (dur > 5000) {
      sendEvent(buildEvent('problem_view', {
        problemName: getChallengeName(),
      }, dur));
    }
  }
});
