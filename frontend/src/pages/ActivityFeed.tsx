import React, { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';
import './ActivityFeed.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  _id: string;
  platform: string;
  activityType: string;
  metadata: {
    url?: string;
    title?: string;
    repoName?: string;
    repoOwner?: string;
    problemName?: string;
    difficulty?: string;
    language?: string;
    tags?: string[];
  };
  duration: number;
  timestamp: string;
}

interface WeekDay {
  date: string;
  totalTimeMs: number;
  problemsSolved: number;
  productivityScore: number;
  platformBreakdown?: Record<string, number>;
}

interface HeatmapSession {
  date: string;
  totalTimeMs: number;
  problemsSolved: number;
  productivityScore: number;
}

interface SummaryData {
  totalTimeMs: number;
  problemsSolved: number;
  streak: number;
  articlesRead: number;
  platformBreakdown: Record<string, number>;
  recentActivity: ActivityItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, string> = {
  github: '🐱',
  leetcode: '🧩',
  hackerrank: '🟢',
  codeforces: '🔵',
  geeksforgeeks: '🌱',
  stackoverflow: '📚',
  docs: '📖',
  other: '🌐',
};

const ACTIVITY_LABELS: Record<string, string> = {
  repo_visit: 'Visited repo',
  repo_code_view: 'Viewed code',
  repo_push: '🚀 Pushed to',
  repo_commit_view: 'Viewed commit',
  problem_view: 'Viewed problem',
  problem_solved: '✅ Solved problem',
  problem_attempted: 'Attempted problem',
  article_read: 'Read article',
  docs_read: 'Read docs',
  profile_view: 'Viewed profile',
  question_view: 'Read question',
  pr_view: 'Viewed PR',
  issue_view: 'Viewed issue',
  contest_participated: 'Contest',
  coding_session: 'Coding session',
};

const PLATFORMS = ['all', 'github', 'leetcode', 'hackerrank', 'codeforces', 'geeksforgeeks', 'stackoverflow', 'docs'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDuration = (ms: number): string => {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${Math.floor(ms / 1000)}s`;
};

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString();
};

const getHeatmapLevel = (ms: number): number => {
  if (ms === 0) return 0;
  if (ms < 900000) return 1;  // < 15 min
  if (ms < 1800000) return 2; // < 30 min
  if (ms < 3600000) return 3; // < 1h
  if (ms < 7200000) return 4; // < 2h
  return 5;
};

// ─── Component ────────────────────────────────────────────────────────────────

const ActivityFeed: React.FC = () => {
  const { token } = useContext(AuthContext);
  const headers = { Authorization: `Bearer ${token}` };

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapSession[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [platform, setPlatform] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);

  // ── Initial data loads ──
  useEffect(() => {
    if (!token) return;
    Promise.all([
      axios.get(`${API_BASE_URL}/api/activity/summary`, { headers }),
      axios.get(`${API_BASE_URL}/api/activity/weekly`, { headers }),
      axios.get(`${API_BASE_URL}/api/activity/heatmap`, { headers }),
    ])
      .then(([s, w, h]) => {
        setSummary(s.data);
        setWeekDays(w.data.days || []);
        setHeatmap(h.data.sessions || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  // ── Feed load ──
  const loadFeed = useCallback(
    async (p: number, pf: string, replace: boolean) => {
      if (!token) return;
      setFeedLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/activity/feed`, {
          headers,
          params: { page: p, limit: 20, platform: pf },
        });
        const { activities: items, pagination } = res.data;
        setActivities((prev) => (replace ? items : [...prev, ...items]));
        setHasMore(p < pagination.pages);
        setPage(p);
      } catch (_) {}
      setFeedLoading(false);
    },
    [token]
  );

  useEffect(() => {
    loadFeed(1, platform, true);
  }, [platform]);

  // ── Platform breakdown for side panel ──
  const totalTime = summary?.totalTimeMs || 0;
  const breakdown = summary?.platformBreakdown || {};
  const sortedPlatforms = Object.entries(breakdown)
    .filter(([, ms]) => ms > 0)
    .sort(([, a], [, b]) => b - a);

  // ── Heatmap data map ──
  const heatmapMap = new Map(heatmap.map((s) => [s.date, s]));

  // Build 90-day array
  const heatmapDays: { date: string; level: number; ms: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const session = heatmapMap.get(dateStr);
    heatmapDays.push({
      date: dateStr,
      level: session ? getHeatmapLevel(session.totalTimeMs) : 0,
      ms: session?.totalTimeMs || 0,
    });
  }

  // ── Weekly bar max ──
  const maxWeekMs = Math.max(...weekDays.map((d) => d.totalTimeMs), 1);

  if (loading) {
    return (
      <div className="activity-feed-page">
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Loading activity data...
        </div>
      </div>
    );
  }

  return (
    <div className="activity-feed-page">
      {/* Page Header */}
      <div className="activity-header">
        <div className="activity-header-left">
          <h2>Activity Feed</h2>
          <p>Your developer activity tracked automatically by the PersonalOS browser extension.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="activity-summary-cards">
        <div className="activity-summary-card">
          <div className="asc-icon purple">⏱️</div>
          <div className="asc-info">
            <div className="value">{formatDuration(summary?.totalTimeMs || 0)}</div>
            <div className="label">Coding Today</div>
          </div>
        </div>
        <div className="activity-summary-card">
          <div className="asc-icon green">✅</div>
          <div className="asc-info">
            <div className="value">{summary?.problemsSolved || 0}</div>
            <div className="label">Problems Solved</div>
          </div>
        </div>
        <div className="activity-summary-card">
          <div className="asc-icon orange">🔥</div>
          <div className="asc-info">
            <div className="value">{summary?.streak || 0} days</div>
            <div className="label">Current Streak</div>
          </div>
        </div>
        <div className="activity-summary-card">
          <div className="asc-icon blue">📖</div>
          <div className="asc-info">
            <div className="value">{summary?.articlesRead || 0}</div>
            <div className="label">Articles Read</div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="heatmap-card">
        <div className="card-title">90-Day Activity Heatmap</div>
        <div className="heatmap-grid">
          {heatmapDays.map((day) => (
            <div
              key={day.date}
              className={`heatmap-cell level-${day.level}`}
              title={`${day.date}: ${day.ms > 0 ? formatDuration(day.ms) : 'No activity'}`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>Less</span>
          {[0,1,2,3,4,5].map(l => (
            <div key={l} className={`heatmap-cell level-${l}`} style={{ width: 10, height: 10 }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Main content grid */}
      <div className="activity-content-grid">
        {/* Left: Weekly Chart + Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Weekly Chart */}
          <div className="weekly-chart">
            <div className="card-title">This Week</div>
            <div className="week-bars">
              {weekDays.map((day) => {
                const heightPct = totalTime > 0 ? (day.totalTimeMs / maxWeekMs) * 100 : 0;
                return (
                  <div key={day.date} className="week-bar-wrap">
                    <div
                      className="week-bar"
                      style={{ height: `${heightPct}%` }}
                      title={`${day.date}: ${formatDuration(day.totalTimeMs)}`}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {weekDays.map((day) => (
                <div key={day.date} className="week-day-label" style={{ flex: 1, textAlign: 'center' }}>
                  {DAYS[new Date(day.date + 'T12:00:00').getDay()]}
                </div>
              ))}
            </div>
          </div>

          {/* Feed */}
          <div className="feed-card">
            <div className="card-title">Activity Log</div>

            {/* Filters */}
            <div className="feed-filters">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  className={`filter-btn ${platform === p ? 'active' : ''}`}
                  onClick={() => setPlatform(p)}
                >
                  {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* Items */}
            {activities.length === 0 && !feedLoading ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-title">No activity yet</div>
                <div className="empty-state-desc">
                  Install the PersonalOS Chrome Extension and start browsing GitHub, LeetCode, or Stack Overflow!
                </div>
              </div>
            ) : (
              <div className="feed-items">
                {activities.map((a) => (
                  <div key={a._id} className={`feed-item ${a.platform}`}>
                    <div className="feed-icon">{PLATFORM_ICONS[a.platform] || '🌐'}</div>
                    <div className="feed-item-body">
                      <div className="feed-item-title">
                        {ACTIVITY_LABELS[a.activityType] || a.activityType}
                        {a.metadata.problemName && `: ${a.metadata.problemName}`}
                        {!a.metadata.problemName && a.metadata.repoName && `: ${a.metadata.repoOwner}/${a.metadata.repoName}`}
                        {!a.metadata.problemName && !a.metadata.repoName && a.metadata.title && `: ${a.metadata.title}`}
                      </div>
                      <div className="feed-item-meta">
                        <span className="feed-item-platform">{a.platform}</span>
                        {a.metadata.difficulty && (
                          <span className={`difficulty-badge ${a.metadata.difficulty}`}>
                            {a.metadata.difficulty}
                          </span>
                        )}
                        {a.duration > 0 && (
                          <span className="feed-item-duration">{formatDuration(a.duration)}</span>
                        )}
                        {a.metadata.language && (
                          <span className="feed-item-duration">{a.metadata.language}</span>
                        )}
                        <span className="feed-item-time">{formatTimestamp(a.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasMore && (
              <button
                className="load-more-btn"
                onClick={() => loadFeed(page + 1, platform, false)}
                disabled={feedLoading}
              >
                {feedLoading ? 'Loading...' : 'Load more'}
              </button>
            )}
          </div>
        </div>

        {/* Right: Platform Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="platform-breakdown-card">
            <div className="card-title">Today's Platforms</div>
            {sortedPlatforms.length === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                No platform data yet today.
              </div>
            ) : (
              sortedPlatforms.map(([p, ms]) => {
                const pct = totalTime > 0 ? (ms / totalTime) * 100 : 0;
                return (
                  <div key={p}>
                    <div className="platform-row">
                      <span className="platform-row-icon">{PLATFORM_ICONS[p] || '🌐'}</span>
                      <span className="platform-row-name" style={{ textTransform: 'capitalize' }}>{p}</span>
                      <span className="platform-row-time">{formatDuration(ms)}</span>
                    </div>
                    <div className="platform-bar-bg">
                      <div className="platform-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityFeed;
