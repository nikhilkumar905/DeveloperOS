import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';
import { ExtensionSettings, MessageType, ActivityEvent } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SETTINGS_KEY = 'extension_settings';

const sendMessage = <T = unknown>(msg: MessageType): Promise<T> =>
  new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));

const formatDuration = (ms: number): string => {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${Math.floor(ms / 1000)}s`;
};

const formatTime = (iso: string | null): string => {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatTimestamp = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Math.max(0, Date.now() - d.getTime());
  if (diff < 60000) {
    const secs = Math.max(1, Math.floor(diff / 1000));
    return `${secs}s ago`;
  }
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString();
};

const PLATFORM_ICONS: Record<string, string> = {
  github: '🐱',
  leetcode: '🧩',
  hackerrank: '🟢',
  codeforces: '🔵',
  geeksforgeeks: '🌱',
  stackoverflow: '📚',
  docs: '📖',
};

const PLATFORM_LABELS: Record<string, string> = {
  github: 'GitHub',
  leetcode: 'LeetCode',
  hackerrank: 'HackerRank',
  codeforces: 'Codeforces',
  geeksforgeeks: 'GeeksforGeeks',
  stackoverflow: 'Stack Overflow',
  docs: 'Docs Sites',
};

const ACTIVITY_LABELS: Record<string, string> = {
  repo_visit: 'Visited repo',
  repo_code_view: 'Viewed code in',
  repo_push: '🚀 Pushed to',
  repo_commit_view: 'Viewed commit in',
  problem_view: 'Viewed problem',
  problem_solved: '✅ Solved',
  problem_attempted: 'Attempted',
  article_read: 'Read article',
  docs_read: 'Read docs',
  profile_view: 'Viewed profile',
  question_view: 'Read question',
  pr_view: 'Viewed PR in',
  issue_view: 'Viewed issue in',
  contest_participated: 'Participated in contest',
};

// ─── Default Settings ─────────────────────────────────────────────────────────

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

// ─── Main Popup Component ─────────────────────────────────────────────────────

const Popup: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [tokenInput, setTokenInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [todayStats, setTodayStats] = useState<{
    totalTimeMs: number;
    problemsSolved: number;
    streak: number;
  } | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'settings'>('stats');

  // ── Load settings on mount ──
  useEffect(() => {
    chrome.storage.local.get(SETTINGS_KEY, (result) => {
      const s: ExtensionSettings = result[SETTINGS_KEY] || DEFAULT_SETTINGS;
      setSettings(s);
      setIsConnected(!!s.token);
    });
  }, []);

  // ── Load pending count ──
  useEffect(() => {
    sendMessage<{ count: number }>({ type: 'GET_PENDING_COUNT' })
      .then((res) => setPendingCount(res?.count || 0))
      .catch(() => {});
  }, []);

  // ── Load today's stats from backend ──
  const loadTodayStats = useCallback(async () => {
    if (!settings.token) return;
    try {
      const res = await fetch(`${settings.backendUrl}/api/activity/summary`, {
        headers: { Authorization: `Bearer ${settings.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTodayStats({
          totalTimeMs: data.totalTimeMs,
          problemsSolved: data.problemsSolved,
          streak: data.streak,
        });
        setRecentActivity(data.recentActivity || []);
      }
    } catch (_) {}
  }, [settings.token, settings.backendUrl]);

  useEffect(() => {
    if (isConnected) loadTodayStats();
  }, [isConnected, loadTodayStats]);

  // ── Save token ──
  const handleConnect = async () => {
    if (!tokenInput.trim()) {
      setMessage({ text: 'Please paste your PersonalOS token.', type: 'error' });
      return;
    }
    const newSettings = { ...settings, token: tokenInput.trim() };
    await chrome.storage.local.set({ [SETTINGS_KEY]: newSettings });
    setSettings(newSettings);
    setIsConnected(true);
    setTokenInput('');
    setMessage({ text: 'Connected successfully!', type: 'success' });
    setTimeout(() => setMessage(null), 2000);
  };

  // ── Disconnect ──
  const handleDisconnect = async () => {
    const newSettings = { ...settings, token: '' };
    await chrome.storage.local.set({ [SETTINGS_KEY]: newSettings });
    setSettings(newSettings);
    setIsConnected(false);
    setTodayStats(null);
    setRecentActivity([]);
  };

  // ── Clear Account History ──
  const handleClearHistory = async () => {
    if (!settings.token) return;
    try {
      await fetch(`${settings.backendUrl}/api/activity/logs`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${settings.token}` },
      });
      setRecentActivity([]);
      setTodayStats({ totalTimeMs: 0, problemsSolved: 0, streak: 0 });
      setMessage({ text: 'History cleared!', type: 'success' });
      setTimeout(() => setMessage(null), 2000);
    } catch (_) {}
  };

  // ── Toggle platform ──
  const handlePlatformToggle = async (platform: string, enabled: boolean) => {
    const newPlatforms = { ...settings.platforms, [platform]: enabled } as ExtensionSettings['platforms'];
    const newSettings = { ...settings, platforms: newPlatforms };
    await chrome.storage.local.set({ [SETTINGS_KEY]: newSettings });
    setSettings(newSettings);
  };

  // ── Manual sync ──
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await sendMessage<{ count: number }>({ type: 'SYNC_NOW' });
      setPendingCount(0);
      setMessage({ text: `Synced ${res?.count || 0} events!`, type: 'success' });
      setTimeout(() => setMessage(null), 2000);
      if (isConnected) loadTodayStats();
    } catch (_) {
      setMessage({ text: 'Sync failed. Check your connection.', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSyncing(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="header">
        <div className="header-logo">⚡</div>
        <span className="header-title">PersonalOS</span>
        <div className="header-status">
          <div className={`status-dot ${isConnected ? 'connected' : ''}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {/* Not Connected — Show Token Form */}
      {!isConnected ? (
        <div className="connect-section">
          <div>
            <div className="connect-title">Connect to PersonalOS</div>
            <div className="connect-desc" style={{ marginTop: 4 }}>
              Paste your API token to start tracking your developer activity automatically.
            </div>
          </div>
          <input
            type="password"
            className="token-input"
            placeholder="Paste your PersonalOS token..."
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          />
          {message && (
            <span className={message.type === 'error' ? 'error-msg' : 'success-msg'}>
              {message.text}
            </span>
          )}
          <button className="btn btn-primary" onClick={handleConnect}>
            Connect Account
          </button>
          <span className="hint">
            Get your token from{' '}
            <a href="http://localhost:6501/dashboard" target="_blank" rel="noreferrer">
              PersonalOS Dashboard → Settings
            </a>
          </span>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
            {(['stats', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '9px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: activeTab === tab ? '#6366f1' : '#64748b',
                  borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize',
                }}
              >
                {tab === 'stats' ? '📊 Today' : '⚙️ Settings'}
              </button>
            ))}
          </div>

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="stats-section">
              {/* Today's Stats */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value accent">
                    {todayStats ? formatDuration(todayStats.totalTimeMs) : '—'}
                  </div>
                  <div className="stat-label">Coding Time</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value green">{todayStats?.problemsSolved ?? '—'}</div>
                  <div className="stat-label">Solved</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value orange">
                    {todayStats?.streak ?? '—'}
                    {todayStats && todayStats.streak > 0 ? '🔥' : ''}
                  </div>
                  <div className="stat-label">Day Streak</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <div className="section-title">Recent Activity</div>
                <div className="recent-list">
                  {recentActivity.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#475569', padding: '8px 0' }}>
                      No activity tracked yet today. Browse GitHub, LeetCode, or Stack Overflow to start!
                    </div>
                  ) : (
                    recentActivity.slice(0, 5).map((a: any, i: number) => (
                      <div key={i} className={`activity-item ${a.platform}`}>
                        <span>{PLATFORM_ICONS[a.platform] || '🌐'}</span>
                        <div className="activity-text">
                          {ACTIVITY_LABELS[a.activityType] || a.activityType}{' '}
                          {a.metadata?.problemName || a.metadata?.repoName || a.metadata?.title || ''}
                        </div>
                        <div className="activity-time">
                          {formatTimestamp(a.timestamp) || formatDuration(a.duration)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Message */}
              {message && (
                <span className={message.type === 'error' ? 'error-msg' : 'success-msg'}>
                  {message.text}
                </span>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="stats-section">
              <div>
                <div className="section-title">Track on Platforms</div>
                <div className="platform-list">
                  {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                    <div key={key} className="platform-item">
                      <div className="platform-name">
                        <span className="platform-icon">{PLATFORM_ICONS[key]}</span>
                        {label}
                      </div>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={settings.platforms[key as keyof typeof settings.platforms] ?? true}
                          onChange={(e) => handlePlatformToggle(key, e.target.checked)}
                        />
                        <span className="slider" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="divider" />

              <button
                className="btn btn-secondary"
                onClick={handleClearHistory}
                style={{ marginTop: 4, marginBottom: 6, borderColor: '#f43f5e', color: '#f43f5e' }}
              >
                🗑️ Clear Activity History
              </button>

              <button
                className="btn btn-danger"
                onClick={handleDisconnect}
              >
                Disconnect Account
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <div className="sync-info">
              Last sync: {formatTime(settings.lastSync)}
              {pendingCount > 0 && (
                <span className="pending-badge" style={{ marginLeft: 6 }}>
                  {pendingCount} pending
                </span>
              )}
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleSync}
              disabled={syncing}
              style={{ padding: '5px 12px' }}
            >
              {syncing ? '⟳ Syncing...' : '↑ Sync Now'}
            </button>
          </div>
        </>
      )}
    </>
  );
};

// ─── Mount ────────────────────────────────────────────────────────────────────

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Popup />);
