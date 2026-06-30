/**
 * LeetCode Content Script
 * Detects: problem views, successful submissions, problem attempts
 * Uses MutationObserver to detect the submission result banner appearing in the DOM.
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
  platform: 'leetcode',
  activityType,
  metadata: {
    url: window.location.href,
    title: document.title,
    ...metadata,
  },
  duration,
  timestamp: new Date().toISOString(),
});

// ─── Parse LeetCode URL ────────────────────────────────────────────────────────

const parseLeetCodeUrl = (): { slug: string | null; isProblemPage: boolean } => {
  const match = window.location.pathname.match(/^\/problems\/([^/]+)/);
  return {
    slug: match ? match[1] : null,
    isProblemPage: !!match,
  };
};

// ─── Extract Difficulty from Page ─────────────────────────────────────────────

const getDifficulty = (): 'Easy' | 'Medium' | 'Hard' | undefined => {
  const el = document.querySelector('[diff]') ||
    document.querySelector('.text-difficulty-easy') ||
    document.querySelector('.text-difficulty-medium') ||
    document.querySelector('.text-difficulty-hard') ||
    document.querySelector('[class*="difficulty"]');

  if (!el) return undefined;
  const text = el.textContent?.trim().toLowerCase();
  if (text?.includes('easy')) return 'Easy';
  if (text?.includes('medium')) return 'Medium';
  if (text?.includes('hard')) return 'Hard';
  return undefined;
};

// ─── Get Problem Title ─────────────────────────────────────────────────────────

const getProblemTitle = (): string => {
  // Try breadcrumb or h1 title
  const h = document.querySelector('[data-cy="question-title"]') ||
    document.querySelector('.mr-2.text-label-1') ||
    document.querySelector('h1') ||
    document.querySelector('.question-title');
  return h?.textContent?.trim() || document.title;
};

// ─── Detect Language ───────────────────────────────────────────────────────────

const getLanguage = (): string => {
  const sel = document.querySelector('[id*="lang-select"]') ||
    document.querySelector('[class*="lang-select"]');
  return sel?.textContent?.trim() || '';
};

// ─── Track Page Entry ──────────────────────────────────────────────────────────

let entryTime = Date.now();
let hasReportedSolved = false;
let hasReportedView = false;
const { slug, isProblemPage } = parseLeetCodeUrl();

const getCappedDuration = (): number => {
  const dur = Date.now() - entryTime;
  entryTime = Date.now(); // Reset timer so subsequent events time fresh interval
  return Math.min(dur, 60 * 60 * 1000); // Cap any single interval at 1 hour max
};

if (isProblemPage && slug) {
  // Fire a "problem_view" event shortly on page load
  setTimeout(() => {
    if (hasReportedView) return;
    hasReportedView = true;
    sendEvent(buildEvent('problem_view', {
      problemSlug: slug,
      problemName: getProblemTitle(),
      difficulty: getDifficulty(),
      language: getLanguage(),
    }, getCappedDuration()));
  }, 3000);
}

// ─── Observe Submission Result ────────────────────────────────────────────────

if (isProblemPage && slug) {
  const observer = new MutationObserver(() => {
    if (hasReportedSolved) return;

    // LeetCode shows a result dialog or verdict text after submission
    const accepted = document.querySelector(
      '[data-e2e-locator="submission-result"]'
    );

    if (accepted) {
      const resultText = accepted.textContent?.toLowerCase() || '';
      const isAccepted = resultText.includes('accepted');
      const isWrong = resultText.includes('wrong answer') ||
        resultText.includes('runtime error') ||
        resultText.includes('time limit');

      if (isAccepted && !hasReportedSolved) {
        hasReportedSolved = true;
        sendEvent(buildEvent('problem_solved', {
          problemSlug: slug,
          problemName: getProblemTitle(),
          difficulty: getDifficulty(),
          language: getLanguage(),
        }, getCappedDuration()));
        observer.disconnect();
      } else if (isWrong && !hasReportedSolved) {
        sendEvent(buildEvent('problem_attempted', {
          problemSlug: slug,
          problemName: getProblemTitle(),
          difficulty: getDifficulty(),
          language: getLanguage(),
        }, getCappedDuration()));
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Report session on page leave
window.addEventListener('pagehide', () => {
  if (isProblemPage && slug && !hasReportedSolved) {
    const dur = getCappedDuration();
    if (dur > 5000) {
      sendEvent(buildEvent('problem_view', {
        problemSlug: slug,
        problemName: getProblemTitle(),
        difficulty: getDifficulty(),
        language: getLanguage(),
      }, dur));
    }
  }
});
