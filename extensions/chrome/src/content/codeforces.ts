/**
 * Codeforces Content Script
 * Detects: problem views, contest participation, submission attempts
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
  platform: 'codeforces',
  activityType,
  metadata: { url: window.location.href, title: document.title, ...metadata },
  duration,
  timestamp: new Date().toISOString(),
});

const entryTime = Date.now();
const path = window.location.pathname;

const isProblemPage = /\/problemset\/problem\/|\/contest\/\d+\/problem\//.test(path);
const isContestPage = /\/contest\/\d+\//.test(path);

const getProblemTitle = (): string => {
  const h = document.querySelector('.problem-statement .title') ||
    document.querySelector('div.title');
  return h?.textContent?.trim() || document.title;
};

const getContestName = (): string => {
  const h = document.querySelector('.rtable td a') ||
    document.querySelector('.caption');
  return h?.textContent?.trim() || document.title;
};

if (isProblemPage) {
  setTimeout(() => {
    sendEvent(buildEvent('problem_view', {
      problemName: getProblemTitle(),
    }, Date.now() - entryTime));
  }, 2000);
} else if (isContestPage) {
  sendEvent(buildEvent('contest_participated', {
    contestName: getContestName(),
  }));
}

// Watch for verdict after submission
const observer = new MutationObserver(() => {
  const verdict = document.querySelector('[class*="verdict-accepted"]') ||
    document.querySelector('.verdict-accepted');
  if (verdict) {
    sendEvent(buildEvent('problem_solved', {
      problemName: getProblemTitle(),
    }, Date.now() - entryTime));
    observer.disconnect();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('pagehide', () => {
  const duration = Date.now() - entryTime;
  if (isProblemPage && duration > 10000) {
    sendEvent(buildEvent('problem_view', {
      problemName: getProblemTitle(),
    }, duration));
  }
});
