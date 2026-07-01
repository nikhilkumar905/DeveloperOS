/**
 * PersonalOS Extension — Background Service Worker (Manifest V3)
 * 
 * Responsibilities:
 *  - Buffer activity events from content scripts
 *  - Flush buffer to backend every 5 minutes via chrome.alarms
 *  - Track active tab time
 *  - Authenticate with PersonalOS JWT token
 */

import { ActivityEvent, ExtensionSettings, MessageType } from './types';

const BUFFER_KEY = 'activity_buffer';
const SETTINGS_KEY = 'extension_settings';
const FLUSH_ALARM = 'flush_activity_buffer';
const FLUSH_INTERVAL_MINUTES = 1;

// ─── Default Settings ────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: ExtensionSettings = {
  token: '',
  backendUrl: 'http://localhost:6500',
  platforms: {
    github: true,
    leetcode: true,
    hackerrank: true,
    codeforces: true,
    geeksforgeeks: true,
    stackoverflow: true,
    docs: true,
    other: false,
  },
  lastSync: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return result[SETTINGS_KEY] || DEFAULT_SETTINGS;
}

async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

async function getBuffer(): Promise<ActivityEvent[]> {
  const result = await chrome.storage.local.get(BUFFER_KEY);
  return result[BUFFER_KEY] || [];
}

async function addToBuffer(event: ActivityEvent): Promise<void> {
  const buffer = await getBuffer();
  buffer.push(event);
  // Cap buffer at 500 events to prevent excessive storage use
  const capped = buffer.slice(-500);
  await chrome.storage.local.set({ [BUFFER_KEY]: capped });
}

async function clearBuffer(): Promise<void> {
  await chrome.storage.local.set({ [BUFFER_KEY]: [] });
}

// ─── Flush to Backend ─────────────────────────────────────────────────────────

async function flushBuffer(): Promise<number> {
  const settings = await getSettings();

  if (!settings.token) {
    console.log('[PersonalOS] No token configured, skipping flush.');
    return 0;
  }

  const buffer = await getBuffer();
  if (buffer.length === 0) return 0;

  // Filter events by user's platform settings
  const filtered = buffer.filter((e) => settings.platforms[e.platform] !== false);
  if (filtered.length === 0) {
    await clearBuffer();
    return 0;
  }

  try {
    const response = await fetch(`${settings.backendUrl}/api/activity/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.token}`,
      },
      body: JSON.stringify({ events: filtered }),
    });

    if (response.ok) {
      await clearBuffer();
      const updated = { ...settings, lastSync: new Date().toISOString() };
      await saveSettings(updated);
      console.log(`[PersonalOS] Flushed ${filtered.length} events to backend.`);
      return filtered.length;
    } else if (response.status === 401) {
      console.warn('[PersonalOS] Auth token expired or invalid. Please reconnect.');
      return 0;
    } else {
      console.error('[PersonalOS] Flush failed:', response.status, response.statusText);
      return 0;
    }
  } catch (err) {
    console.error('[PersonalOS] Network error during flush:', err);
    return 0;
  }
}

// ─── Tab Time Tracking ────────────────────────────────────────────────────────

let activeTabId: number | null = null;
let activeTabStart: number | null = null;
let activeTabUrl: string | null = null;

function stopActiveSession() {
  if (activeTabId !== null && activeTabStart !== null && activeTabUrl) {
    const duration = Date.now() - activeTabStart;
    // Only record sessions > 5 seconds
    if (duration > 5000) {
      // Background passive "coding_session" time tracking is handled by content scripts
      // which send more specific events. We just reset the timer here.
    }
  }
  activeTabStart = null;
  activeTabUrl = null;
}

chrome.tabs.onActivated.addListener(async (info) => {
  stopActiveSession();
  activeTabId = info.tabId;
  try {
    const tab = await chrome.tabs.get(info.tabId);
    activeTabStart = Date.now();
    activeTabUrl = tab.url || null;
  } catch (_) {
    // Tab may have been closed
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    stopActiveSession();
  }
});

// ─── Alarms ────────────────────────────────────────────────────────────────────

chrome.alarms.create(FLUSH_ALARM, {
  periodInMinutes: FLUSH_INTERVAL_MINUTES,
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === FLUSH_ALARM) {
    const count = await flushBuffer();
    if (count > 0) {
      chrome.runtime.sendMessage({ type: 'SYNC_COMPLETE', count } as MessageType).catch(() => {});
    }
  }
});

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: MessageType, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'ACTIVITY_EVENT': {
        await addToBuffer(message.event);
        // Immediately flush on important actions or when buffer reaches 5 events
        if (
          message.event.activityType === 'problem_solved' ||
          message.event.activityType === 'repo_push' ||
          message.event.activityType === 'repo_commit_view'
        ) {
          await flushBuffer();
        }
        sendResponse({ ok: true });
        break;
      }

      case 'GET_SETTINGS': {
        const settings = await getSettings();
        sendResponse({ type: 'SETTINGS_RESPONSE', settings } as MessageType);
        break;
      }

      case 'SYNC_NOW': {
        const count = await flushBuffer();
        sendResponse({ type: 'SYNC_COMPLETE', count } as MessageType);
        break;
      }

      case 'GET_PENDING_COUNT': {
        const buffer = await getBuffer();
        sendResponse({ type: 'PENDING_COUNT_RESPONSE', count: buffer.length } as MessageType);
        break;
      }

      default:
        sendResponse({ ok: false, error: 'Unknown message type' });
    }
  })();
  return true; // Keep message channel open for async response
});

// ─── Install Handler ──────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await saveSettings(DEFAULT_SETTINGS);
    console.log('[PersonalOS] Extension installed. Please set your JWT token in the popup.');
  }
});
