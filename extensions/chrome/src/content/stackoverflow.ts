/**
 * Stack Overflow Content Script
 * Detects: question views, answer interactions, time spent reading
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
  platform: 'stackoverflow',
  activityType,
  metadata: { url: window.location.href, title: document.title, ...metadata },
  duration,
  timestamp: new Date().toISOString(),
});

const entryTime = Date.now();
const path = window.location.pathname;

const isQuestionPage = /\/questions\/\d+/.test(path);

const getQuestionTitle = (): string => {
  const h = document.querySelector('#question-header h1 a') ||
    document.querySelector('h1[itemprop="name"]') ||
    document.querySelector('h1');
  return h?.textContent?.trim() || document.title;
};

const getTags = (): string[] => {
  const tagEls = document.querySelectorAll('.post-tag');
  return Array.from(tagEls).map((el) => el.textContent?.trim() || '').filter(Boolean);
};

if (isQuestionPage) {
  // Only log after 5 seconds to avoid counting accidental clicks
  setTimeout(() => {
    sendEvent(buildEvent('question_view', {
      title: getQuestionTitle(),
      tags: getTags(),
    }, Date.now() - entryTime));
  }, 5000);
}

window.addEventListener('pagehide', () => {
  const duration = Date.now() - entryTime;
  if (isQuestionPage && duration > 5000) {
    sendEvent(buildEvent('question_view', {
      title: getQuestionTitle(),
      tags: getTags(),
    }, duration));
  }
});
