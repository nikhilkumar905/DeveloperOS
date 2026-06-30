import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './ActivityWidget.css';

const API = 'http://localhost:6500';

interface SummaryData {
  totalTimeMs: number;
  problemsSolved: number;
  streak: number;
  platformBreakdown: Record<string, number>;
  recentActivity: Array<{
    _id: string;
    platform: string;
    activityType: string;
    metadata: { problemName?: string; repoName?: string; repoOwner?: string; title?: string };
    duration: number;
    timestamp: string;
  }>;
}

interface WeekDay {
  date: string;
  totalTimeMs: number;
}

const PLATFORM_ICONS: Record<string, string> = {
  github: '🐱', leetcode: '🧩', hackerrank: '🟢',
  codeforces: '🔵', geeksforgeeks: '🌱', stackoverflow: '📚', docs: '📖', other: '🌐',
};

const ACTIVITY_LABELS: Record<string, string> = {
  repo_visit: 'Repo visit', repo_code_view: 'Code view', problem_view: 'Problem viewed',
  problem_solved: '✅ Solved', problem_attempted: 'Attempted', article_read: 'Article read',
  docs_read: 'Docs read', question_view: 'Question read', pr_view: 'PR view', issue_view: 'Issue view',
};

const DAY_ABBR = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const formatDuration = (ms: number): string => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(ms / 1000)}s`;
};

const formatRelTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const ActivityWidget: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [loading, setLoading] = useState(true);

  const [copied, setCopied] = useState(false);

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API}/api/activity/summary`, { headers }),
      axios.get(`${API}/api/activity/weekly`, { headers }),
    ])
      .then(([s, w]) => {
        setSummary(s.data);
        setWeekDays(w.data.days || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const hasActivity = summary && (summary.totalTimeMs > 0 || summary.recentActivity?.length > 0);
  const maxMs = Math.max(...weekDays.map((d) => d.totalTimeMs), 1);

  return (
    <div className="activity-widget">
      {/* Header */}
      <div className="aw-header">
        <div className="aw-title">
          Activity Tracker
          {hasActivity && <span className="aw-live-badge">LIVE</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleCopyToken}
            style={{
              padding: '3px 8px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: copied ? '#10b981' : 'transparent',
              color: copied ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title="Copy JWT token for Chrome Extension"
          >
            {copied ? '✅ Copied Token!' : '🔑 Copy Token'}
          </button>
          <Link to="/dashboard/activity" className="aw-link">View all →</Link>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
          Loading activity...
        </div>
      ) : !hasActivity ? (
        /* Empty — Extension not set up */
        <div className="aw-empty">
          <div className="aw-empty-icon">🧩</div>
          <div className="aw-empty-title">No activity tracked yet</div>
          <div className="aw-empty-desc">
            Install the PersonalOS Chrome Extension to automatically track your coding sessions
            on GitHub, LeetCode, and more.
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button
              className="aw-install-btn"
              onClick={() => window.open('chrome://extensions', '_blank')}
            >
              📦 Load Extension
            </button>
            <button
              className="aw-install-btn"
              style={{ background: '#3b82f6' }}
              onClick={handleCopyToken}
            >
              {copied ? '✅ Token Copied!' : '🔑 Copy Token'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Mini Stats */}
          <div className="aw-stats-row">
            <div className="aw-stat">
              <div className="aw-stat-value purple">
                {formatDuration(summary?.totalTimeMs || 0)}
              </div>
              <div className="aw-stat-label">Today</div>
            </div>
            <div className="aw-stat">
              <div className="aw-stat-value green">{summary?.problemsSolved || 0}</div>
              <div className="aw-stat-label">Solved</div>
            </div>
            <div className="aw-stat">
              <div className="aw-stat-value orange">
                {summary?.streak || 0}🔥
              </div>
              <div className="aw-stat-label">Streak</div>
            </div>
          </div>

          {/* Mini Weekly Bar */}
          <div>
            <div className="aw-bars-label">Last 7 Days</div>
            <div className="aw-bars">
              {weekDays.map((day) => {
                const heightPct = (day.totalTimeMs / maxMs) * 100;
                return (
                  <div key={day.date} className="aw-bar-wrap">
                    <div
                      className="aw-bar"
                      style={{ height: `${heightPct}%` }}
                      title={`${day.date}: ${formatDuration(day.totalTimeMs)}`}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              {weekDays.map((day) => (
                <div key={day.date} className="aw-bar-day" style={{ flex: 1, textAlign: 'center' }}>
                  {DAY_ABBR[new Date(day.date + 'T12:00:00').getDay()]}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          {summary?.recentActivity && summary.recentActivity.length > 0 && (
            <div>
              <div className="aw-recent-label">Recent</div>
              <div className="aw-recent-list">
                {summary.recentActivity.slice(0, 4).map((a) => (
                  <div key={a._id} className={`aw-recent-item ${a.platform}`}>
                    <span className="aw-recent-icon">{PLATFORM_ICONS[a.platform] || '🌐'}</span>
                    <span className="aw-recent-text">
                      {ACTIVITY_LABELS[a.activityType] || a.activityType}
                      {a.metadata.problemName ? ` · ${a.metadata.problemName}` : ''}
                      {!a.metadata.problemName && a.metadata.repoName
                        ? ` · ${a.metadata.repoName}`
                        : ''}
                    </span>
                    <span className="aw-recent-time">{formatRelTime(a.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivityWidget;
