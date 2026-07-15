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

interface MonthData {
  month: string;      // "MM"
  label: string;      // "Jan", "Feb" …
  year: number;
  totalTimeMs: number;
  problemsSolved: number;
  activeDays: number;
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
  // Ensure UTC interpretation — backend stores naive UTC, JS treats no-tz as local otherwise
  const utcIso = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z';
  const d = new Date(utcIso);
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
  const [heatmap, setHeatmap] = useState<HeatmapSession[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [platform, setPlatform] = useState('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);

  // ── Yearly chart state ──
  const [yearMonths, setYearMonths] = useState<MonthData[]>([]);
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // "YYYY-MM"
  const [yearLoading, setYearLoading] = useState(false);

  // ── Initial data loads ──
  useEffect(() => {
    if (!token) return;
    Promise.all([
      axios.get(`${API_BASE_URL}/api/activity/summary`, { headers }),
      axios.get(`${API_BASE_URL}/api/activity/heatmap`, { headers }),
    ])
      .then(([s, h]) => {
        setSummary(s.data);
        setHeatmap(h.data.sessions || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  // ── Yearly chart load ──
  const loadYearData = useCallback(async (year: number) => {
    if (!token) return;
    setYearLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/activity/yearly`, {
        headers, params: { year },
      });
      setYearMonths(res.data.months || []);
      setAvailableYears(res.data.availableYears || [year]);
      setChartYear(res.data.year);
    } catch (_) {}
    setYearLoading(false);
  }, [token]);

  useEffect(() => { loadYearData(chartYear); }, [chartYear, loadYearData]);

  // ── Feed load ──
  const loadFeed = useCallback(
    async (p: number, pf: string, sd: string, replace: boolean, month?: string) => {
      if (!token) return;
      setFeedLoading(true);
      try {
        const params: Record<string, any> = { page: p, limit: 20, platform: pf };
        if (month) params.month = month;       // YYYY-MM: full month filter
        else if (sd) params.date = sd;         // YYYY-MM-DD: single day filter
        const res = await axios.get(`${API_BASE_URL}/api/activity/feed`, { headers, params });
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
    if (selectedMonth) {
      loadFeed(1, platform, '', true, selectedMonth);
    } else {
      loadFeed(1, platform, selectedDate, true);
    }
  }, [platform, selectedDate, selectedMonth, loadFeed]);

  // ── Month click → month-range filter in feed ──
  const handleMonthClick = (m: MonthData) => {
    const key = `${m.year}-${m.month}`;
    if (selectedMonth === key) {
      setSelectedMonth('');
      setSelectedDate('');
    } else {
      setSelectedMonth(key);
      setSelectedDate(''); // clear single-day filter when month is active
    }
  };

  // ── Year change ──
  const handleYearChange = (newYear: number) => {
    setChartYear(newYear);
    setSelectedMonth(''); // fix: clear active month filter when year changes
    setSelectedDate('');
  };

  // Listen for background auto-sync completion to refresh UI automatically
  useEffect(() => {
    const handleSync = () => {
      if (token) {
        Promise.all([
          axios.get(`${API_BASE_URL}/api/activity/summary`, { headers }),
          axios.get(`${API_BASE_URL}/api/activity/heatmap`, { headers }),
        ]).then(([s, h]) => {
          setSummary(s.data);
          setHeatmap(h.data.sessions || []);
        }).catch(() => {});
        loadFeed(page, platform, selectedDate, true);
      }
    };
    window.addEventListener('personalos-sync-complete', handleSync);
    return () => window.removeEventListener('personalos-sync-complete', handleSync);
  }, [token, page, platform, selectedDate, loadFeed]);

  // ── Yearly chart derived values ──
  const maxMonthMs = Math.max(...yearMonths.map(m => m.totalTimeMs), 1);
  const yearTotal = yearMonths.reduce((acc, m) => acc + m.totalTimeMs, 0);
  const yearProblems = yearMonths.reduce((acc, m) => acc + m.problemsSolved, 0);
  const yearActiveDays = yearMonths.reduce((acc, m) => acc + m.activeDays, 0);

  // ── SVG Curve path for Hill Graph ──
  const svgWidth = 1200;
  const svgHeight = 120;
  const points = yearMonths.map((m, i) => {
    // distribute 12 points evenly across 1200px (0 to 1200)
    const x = (i / 11) * svgWidth;
    // Map time to Y coordinate (0 is top, svgHeight is bottom). 
    // Leave 20px padding at the top for peaks.
    const y = maxMonthMs > 0 ? svgHeight - (m.totalTimeMs / maxMonthMs) * (svgHeight - 20) : svgHeight; 
    return { x, y, m };
  });

  let pathD = "";
  let areaD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i-1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2; // Control point x (horizontal flattening)
      // Cubic bezier curve for smooth hills
      pathD += ` C ${cpX},${prev.y} ${cpX},${curr.y} ${curr.x},${curr.y}`;
    }
    // Area closes at the bottom corners
    areaD = `${pathD} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`;
  }

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
    const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    const dateStr = localDate.toISOString().split('T')[0];
    const session = heatmapMap.get(dateStr);
    heatmapDays.push({
      date: dateStr,
      level: session ? getHeatmapLevel(session.totalTimeMs) : 0,
      ms: session?.totalTimeMs || 0,
    });
  }




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
              className={`heatmap-cell level-${day.level} ${selectedDate === day.date ? 'selected-cell' : ''}`}
              title={`${day.date}: ${day.ms > 0 ? formatDuration(day.ms) : 'No activity'}`}
              onClick={() => setSelectedDate(day.date)}
              style={{ cursor: 'pointer', border: selectedDate === day.date ? '2px solid #fff' : 'none' }}
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
          {/* ── Yearly Activity Chart ── */}
          <div className="yearly-chart">
            {/* Header row: title + year nav + stats */}
            <div className="yearly-chart-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="card-title" style={{ margin: 0 }}>Activity Overview</div>
                {yearLoading && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>loading…</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="year-nav-btn"
                  onClick={() => handleYearChange(chartYear - 1)}
                  title="Previous year"
                >‹</button>
                <div className="year-display">
                  {availableYears.length > 1 ? (
                    <select
                      value={chartYear}
                      onChange={e => handleYearChange(Number(e.target.value))}
                      className="year-select"
                    >
                      {availableYears.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  ) : (
                    <span>{chartYear}</span>
                  )}
                </div>
                <button
                  className="year-nav-btn"
                  onClick={() => handleYearChange(chartYear + 1)}
                  disabled={chartYear >= new Date().getFullYear()}
                  title="Next year"
                >›</button>
              </div>
            </div>

            {/* Year totals */}
            <div className="yearly-stats-row">
              <div className="yearly-stat">
                <span className="yearly-stat-value">{formatDuration(yearTotal)}</span>
                <span className="yearly-stat-label">Total Time</span>
              </div>
              <div className="yearly-stat">
                <span className="yearly-stat-value">{yearProblems}</span>
                <span className="yearly-stat-label">Problems Solved</span>
              </div>
              <div className="yearly-stat">
                <span className="yearly-stat-value">{yearActiveDays}</span>
                <span className="yearly-stat-label">Active Days</span>
              </div>
            </div>

            {/* Monthly graph (Hill/Curve) */}
            <div className="yearly-bars-container" style={{ position: 'relative' }}>
              <svg 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                preserveAspectRatio="none" 
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100% - 28px)', pointerEvents: 'none' }}
              >
                <defs>
                  <linearGradient id="hillGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                
                {areaD && <path d={areaD} fill="url(#hillGradient)" />}
                {pathD && <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
                
                {/* Dots at each month */}
                {points.map((p, i) => (
                  <circle 
                    key={i} 
                    cx={p.x} 
                    cy={p.y} 
                    r="5" 
                    fill="#151821" 
                    stroke={p.m.totalTimeMs > 0 ? "#8b5cf6" : "rgba(255,255,255,0.2)"} 
                    strokeWidth="2.5" 
                  />
                ))}
              </svg>

              {/* Overlay clickable zones and labels */}
              {yearMonths.map(m => {
                const key = `${m.year}-${m.month}`;
                const isActive = selectedMonth === key;
                const isEmpty = m.totalTimeMs === 0;
                return (
                  <div
                    key={key}
                    className={`yearly-bar-col ${isActive ? 'active' : ''}`}
                    onClick={() => handleMonthClick(m)}
                    title={`${m.label} ${m.year}: ${isEmpty ? 'No activity' : `${formatDuration(m.totalTimeMs)} · ${m.problemsSolved} solved · ${m.activeDays} days`}`}
                  >
                    {/* Invisible overlay track for hover/click area */}
                    <div className="yearly-bar-track" style={{ background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent', borderRadius: 4 }}>
                      {isActive && <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '3px', background: '#10b981', boxShadow: '0 -2px 8px rgba(16,185,129,0.5)' }} />}
                    </div>
                    
                    <div className="yearly-bar-label">{m.label}</div>
                    {m.problemsSolved > 0 && (
                      <div className="yearly-bar-sub">{m.problemsSolved}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {yearTotal === 0 && !yearLoading && (
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                No activity recorded for {chartYear}
              </div>
            )}
          </div>


          {/* Feed */}
          <div className="feed-card">
            <div className="card-title">Activity Log</div>

            {/* Filters */}
            <div className="feed-filters" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
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
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input 
                  type="date" 
                  className="filter-btn" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}
                />
                {selectedDate && (
                  <button className="filter-btn" onClick={() => setSelectedDate('')} title="Clear date filter">
                    ✖
                  </button>
                )}
              </div>
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

            {/* Pagination */}
            {hasMore && (
              <button
                className="load-more-btn"
                onClick={() => loadFeed(page + 1, platform, selectedDate, false)}
                disabled={feedLoading}
              >
                {feedLoading ? 'Loading...' : 'Load More'}
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
