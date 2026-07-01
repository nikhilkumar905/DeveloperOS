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

// ─── Track Page State & SPA Navigation ────────────────────────────────────────

let entryTime = Date.now();
let hasReportedSolved = false;
let hasReportedView = false;
let currentSlug: string | null = parseLeetCodeUrl().slug;
let isCurrentProblemPage = parseLeetCodeUrl().isProblemPage;

const getCappedDuration = (): number => {
  const dur = Date.now() - entryTime;
  entryTime = Date.now();
  return Math.min(dur, 60 * 60 * 1000);
};

const triggerProblemView = () => {
  if (!isCurrentProblemPage || !currentSlug || hasReportedView) return;
  hasReportedView = true;
  sendEvent(buildEvent('problem_view', {
    problemSlug: currentSlug,
    problemName: getProblemTitle(),
    difficulty: getDifficulty(),
    language: getLanguage(),
  }, getCappedDuration()));
};

const reportVerdict = (type: 'solved' | 'attempted') => {
  if (!isCurrentProblemPage || !currentSlug) return;
  if (type === 'solved') {
    if (hasReportedSolved) return;
    hasReportedSolved = true;
    console.log(`[PersonalOS] Problem Solved detected: ${currentSlug}`);
    sendEvent(buildEvent('problem_solved', {
      problemSlug: currentSlug,
      problemName: getProblemTitle(),
      difficulty: getDifficulty(),
      language: getLanguage(),
    }, getCappedDuration()));
  } else {
    if (hasReportedSolved) return; // Don't report attempt if already solved
    console.log(`[PersonalOS] Problem Attempt detected: ${currentSlug}`);
    sendEvent(buildEvent('problem_attempted', {
      problemSlug: currentSlug,
      problemName: getProblemTitle(),
      difficulty: getDifficulty(),
      language: getLanguage(),
    }, getCappedDuration()));
  }
};

const checkSubmissionVerdict = () => {
  if (!isCurrentProblemPage || !currentSlug || hasReportedSolved) return;

  // 1. Check exact data locators first
  const e2eResult = document.querySelector('[data-e2e-locator="submission-result"]');
  if (e2eResult) {
    const text = e2eResult.textContent?.trim().toLowerCase() || '';
    if (text.includes('accepted') && !text.includes('not accepted')) {
      reportVerdict('solved');
      return;
    }
    if (text.includes('wrong answer') || text.includes('runtime error') || text.includes('time limit')) {
      reportVerdict('attempted');
      return;
    }
  }

  // 2. Scan text elements specifically inside submission/verdict areas
  const candidates = document.querySelectorAll('span, div, h3, h4, p, a');
  for (const el of Array.from(candidates)) {
    const text = el.textContent?.trim() || '';
    if (text === 'Accepted' || text === 'Success') {
      const className = (el.className || '') + ' ' + (el.parentElement?.className || '');
      const lower = className.toLowerCase();
      if (
        lower.includes('green') ||
        lower.includes('success') ||
        lower.includes('accepted') ||
        el.closest('[data-layout-path*="submissions"]') ||
        el.closest('[class*="submission"]') ||
        el.closest('[class*="result"]')
      ) {
        reportVerdict('solved');
        return;
      }
    } else if (text === 'Wrong Answer' || text === 'Runtime Error' || text === 'Time Limit Exceeded') {
      const className = (el.className || '') + ' ' + (el.parentElement?.className || '');
      const lower = className.toLowerCase();
      if (
        lower.includes('red') ||
        lower.includes('error') ||
        el.closest('[data-layout-path*="submissions"]') ||
        el.closest('[class*="submission"]') ||
        el.closest('[class*="result"]')
      ) {
        reportVerdict('attempted');
        return;
      }
    }
  }
};

const initObserver = () => {
  const observer = new MutationObserver(() => {
    checkSubmissionVerdict();
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

// ─── Handle SPA Navigation (Next.js / Turbo) ─────────────────────────────────

const handleNavigation = () => {
  const { slug, isProblemPage } = parseLeetCodeUrl();
  if (slug !== currentSlug || isProblemPage !== isCurrentProblemPage) {
    currentSlug = slug;
    isCurrentProblemPage = isProblemPage;
    hasReportedSolved = false;
    hasReportedView = false;
    entryTime = Date.now();

    if (isCurrentProblemPage && currentSlug) {
      setTimeout(triggerProblemView, 3000);
    }
  }
};

const hookHistoryNavigation = () => {
  const originalPushState = history.pushState.bind(history);
  history.pushState = function (state, title, url) {
    originalPushState(state, title, url);
    setTimeout(handleNavigation, 400);
  };

  window.addEventListener('popstate', () => {
    setTimeout(handleNavigation, 400);
  });
};

// Initialize
if (isCurrentProblemPage && currentSlug) {
  setTimeout(triggerProblemView, 3000);
}
initObserver();
hookHistoryNavigation();

window.addEventListener('pagehide', () => {
  if (isCurrentProblemPage && currentSlug && !hasReportedSolved) {
    const dur = getCappedDuration();
    if (dur > 5000) {
      sendEvent(buildEvent('problem_view', {
        problemSlug: currentSlug,
        problemName: getProblemTitle(),
        difficulty: getDifficulty(),
        language: getLanguage(),
      }, dur));
    }
  }
});
