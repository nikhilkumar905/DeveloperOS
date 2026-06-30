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

let entryTime = Date.now();
let hasReportedSolved = false;
const path = window.location.pathname;

const getCappedDuration = (): number => {
  const dur = Date.now() - entryTime;
  entryTime = Date.now();
  return Math.min(dur, 60 * 60 * 1000);
};

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
    }, getCappedDuration()));
  }, 2000);
} else if (isContestPage) {
  sendEvent(buildEvent('contest_participated', {
    contestName: getContestName(),
  }));
}

// Watch for verdict after submission
const observer = new MutationObserver(() => {
  if (hasReportedSolved) return;
  const verdict = document.querySelector('[class*="verdict-accepted"]') ||
    document.querySelector('.verdict-accepted');
  if (verdict && !hasReportedSolved) {
    hasReportedSolved = true;
    sendEvent(buildEvent('problem_solved', {
      problemName: getProblemTitle(),
    }, getCappedDuration()));
    observer.disconnect();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('pagehide', () => {
  if (isProblemPage && !hasReportedSolved) {
    const dur = getCappedDuration();
    if (dur > 5000) {
      sendEvent(buildEvent('problem_view', {
        problemName: getProblemTitle(),
      }, dur));
    }
  }
});
