/**
 * Documentation Sites Content Script
 * Covers: MDN, React Docs, Next.js, Node.js, Python Docs
 * Detects: docs_read events with time spent
 */

import { ActivityEvent } from '../types';

const sendEvent = (event: ActivityEvent): void => {
  chrome.runtime.sendMessage({ type: 'ACTIVITY_EVENT', event });
};

const entryTime = Date.now();

const getDocsPlatform = (): string => {
  const host = window.location.hostname;
  if (host.includes('developer.mozilla.org')) return 'MDN Web Docs';
  if (host.includes('reactjs.org') || host.includes('react.dev')) return 'React Docs';
  if (host.includes('nextjs.org')) return 'Next.js Docs';
  if (host.includes('nodejs.org')) return 'Node.js Docs';
  if (host.includes('docs.python.org')) return 'Python Docs';
  return 'Documentation';
};

const getTitle = (): string => {
  const h = document.querySelector('h1') || document.querySelector('[itemprop="name"]');
  return h?.textContent?.trim() || document.title;
};

const reportDocsRead = (duration: number) => {
  if (duration < 10000) return; // Must spend at least 10 seconds
  const event: ActivityEvent = {
    platform: 'docs',
    activityType: 'docs_read',
    metadata: {
      url: window.location.href,
      title: getTitle(),
      repoName: getDocsPlatform(), // Repurpose repoName for source name
    },
    duration,
    timestamp: new Date().toISOString(),
  };
  sendEvent(event);
};

// Report after 30 seconds if still on page
setTimeout(() => reportDocsRead(30000), 30000);

// Report on leave
window.addEventListener('pagehide', () => {
  reportDocsRead(Date.now() - entryTime);
});
