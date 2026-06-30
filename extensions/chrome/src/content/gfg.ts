/**
 * GeeksforGeeks Content Script
 * Detects: article reads, problem views and solutions
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
  platform: 'geeksforgeeks',
  activityType,
  metadata: { url: window.location.href, title: document.title, ...metadata },
  duration,
  timestamp: new Date().toISOString(),
});

const entryTime = Date.now();
const path = window.location.pathname;

const isProblemPage = /\/problems\//.test(path);
const isArticlePage = !isProblemPage && path.length > 1;

const getTitle = (): string => {
  const h = document.querySelector('h1.article-title') ||
    document.querySelector('.problems_header_content__title__L2cB6') ||
    document.querySelector('h1') ||
    document.querySelector('.article--viewer h1');
  return h?.textContent?.trim() || document.title;
};

// Detect difficulty badge
const getDifficulty = (): 'Easy' | 'Medium' | 'Hard' | undefined => {
  const el = document.querySelector('[class*="difficulty"]') ||
    document.querySelector('[class*="Difficulty"]');
  const text = el?.textContent?.toLowerCase() || '';
  if (text.includes('easy') || text.includes('basic') || text.includes('school')) return 'Easy';
  if (text.includes('medium')) return 'Medium';
  if (text.includes('hard')) return 'Hard';
  return undefined;
};

if (isProblemPage) {
  setTimeout(() => {
    sendEvent(buildEvent('problem_view', {
      problemName: getTitle(),
      difficulty: getDifficulty(),
    }, Date.now() - entryTime));
  }, 2000);
} else if (isArticlePage) {
  setTimeout(() => {
    sendEvent(buildEvent('article_read', {
      title: getTitle(),
    }, Date.now() - entryTime));
  }, 5000); // Require 5 seconds before logging article read
}

window.addEventListener('pagehide', () => {
  const duration = Date.now() - entryTime;
  if (duration < 5000) return;
  if (isProblemPage) {
    sendEvent(buildEvent('problem_view', {
      problemName: getTitle(),
      difficulty: getDifficulty(),
    }, duration));
  } else if (isArticlePage) {
    sendEvent(buildEvent('article_read', {
      title: getTitle(),
    }, duration));
  }
});
