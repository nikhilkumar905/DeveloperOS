import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { BookOpen, Award, Flame, AlertCircle, RefreshCw, XCircle, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL, getErrorMessage, parseUtc } from '../lib/api';
import './LeetCodeStatsWidget.css';
import './GfgStatsWidget.css';

interface GfgStats {
  username: string;
  stats: {
    solvedTotal: number;
    solvedSchool: number;
    solvedBasic: number;
    solvedEasy: number;
    solvedMedium: number;
    solvedHard: number;
    codingScore: number;
    monthlyScore: number;
    currentStreak: number;
    longestStreak: number;
    instituteName: string;
    instituteRank: string;
    languages: Record<string, number>;
    recentActivity: Array<{
      title: string;
      slug: string;
      difficulty: string;
      language: string;
      date: string;
    }>;
    lastSyncedAt: string | null;
  };
}

const GfgStatsWidget: React.FC = () => {
  const { token } = React.useContext(AuthContext);
  const [statsData, setStatsData] = useState<GfgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState('');

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/gfg/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatsData(response.data || null);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to load GeeksforGeeks stats.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchStats();
    }
    // Pick up the silent background sync from useAutoSync
    window.addEventListener('personalos-sync-complete', fetchStats);
    return () => window.removeEventListener('personalos-sync-complete', fetchStats);
  }, [token, fetchStats]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = usernameInput.trim();
    if (!token || !username) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/gfg/connect`,
        { username },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatsData({ username, stats: res.data });
      setError(null);
      window.dispatchEvent(new Event('personalos-integration-updated'));
    } catch (err: any) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to connect GeeksforGeeks account.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!token) return;
    try {
      await axios.post(`${API_BASE_URL}/api/gfg/disconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatsData(null);
      setUsernameInput('');
      window.dispatchEvent(new Event('personalos-integration-updated'));
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to disconnect.'));
    }
  };

  const handleSync = async () => {
    if (!token || !statsData) return;
    setSyncing(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/gfg/sync`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatsData({ ...statsData, stats: res.data });
      setError(null);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to sync data.'));
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="card widget-box leetcode-widget loading"><RefreshCw className="spinner" /> Loading GeeksforGeeks Stats...</div>;
  }

  if (!statsData) {
    return (
      <div className="card widget-box leetcode-widget gfg-widget not-connected">
        <div className="widget-header">
          <h3>GeeksforGeeks Integration</h3>
          <BookOpen size={18} />
        </div>
        <div className="leetcode-connect-content">
          <p>Connect your GeeksforGeeks account to track problems solved, coding score and POTD streaks.</p>
          <form onSubmit={handleConnect} className="leetcode-connect-form">
            <input
              type="text"
              className="input-field"
              placeholder="GeeksforGeeks Username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary gfg-btn" style={{ marginTop: '0.5rem', width: '100%' }}>
              <BookOpen size={16} style={{ marginRight: '8px' }} /> Connect Account
            </button>
          </form>
          {error && <p className="error-text"><AlertCircle size={14}/> {error}</p>}
        </div>
      </div>
    );
  }

  const { stats } = statsData;
  const easyTotal = stats.solvedSchool + stats.solvedBasic + stats.solvedEasy;
  const topLanguages = Object.entries(stats.languages || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="card widget-box leetcode-widget gfg-widget">
      <div className="widget-header">
        <h3>GeeksforGeeks <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>@{statsData.username}</span></h3>
        <div className="leetcode-actions">
          <button className="btn-icon-subtle" onClick={handleSync} disabled={syncing} title="Sync Now">
            <RefreshCw size={16} className={syncing ? 'spinner' : ''} />
          </button>
          <button className="btn-icon-subtle danger" onClick={handleDisconnect} title="Disconnect">
            <XCircle size={16} />
          </button>
        </div>
      </div>

      {error && <div className="error-banner"><AlertCircle size={14} /> {error}</div>}

      <div className="leetcode-stats-content">
        <div className="leetcode-metrics-grid">
          <div className="leetcode-metric">
            <CheckCircle2 size={16} className="metric-icon gfg-solved" />
            <div className="metric-details">
              <span className="metric-value">{stats.solvedTotal}</span>
              <span className="metric-label">Total Solved</span>
            </div>
          </div>
          <div className="leetcode-metric">
            <Award size={16} className="metric-icon rating" />
            <div className="metric-details">
              <span className="metric-value">{stats.codingScore}</span>
              <span className="metric-label">Coding Score</span>
            </div>
          </div>
          <div className="leetcode-metric">
            <Flame size={16} className="metric-icon badge-icon" />
            <div className="metric-details">
              <span className="metric-value">{stats.longestStreak}</span>
              <span className="metric-label">Best POTD Streak</span>
            </div>
          </div>
        </div>

        <div className="leetcode-difficulty-bar">
          <div className="difficulty-segment easy" style={{ flex: easyTotal || 1 }} title={`School/Basic/Easy: ${easyTotal}`}></div>
          <div className="difficulty-segment medium" style={{ flex: stats.solvedMedium || 1 }} title={`Medium: ${stats.solvedMedium}`}></div>
          <div className="difficulty-segment hard" style={{ flex: stats.solvedHard || 1 }} title={`Hard: ${stats.solvedHard}`}></div>
        </div>
        <div className="leetcode-difficulty-labels">
          <span className="easy-label">Easy {easyTotal}</span>
          <span className="medium-label">Med {stats.solvedMedium}</span>
          <span className="hard-label">Hard {stats.solvedHard}</span>
        </div>

        {(topLanguages.length > 0 || stats.instituteRank) && (
          <div className="gfg-meta">
            {topLanguages.length > 0 && (
              <span>Languages: {topLanguages.map(([lang, count]) => `${lang} (${count})`).join(', ')}</span>
            )}
            {stats.instituteRank && <span>Institute Rank: #{stats.instituteRank}</span>}
          </div>
        )}

        {stats.recentActivity && stats.recentActivity.length > 0 && (
          <div className="leetcode-recent">
            <h5>Recently Solved</h5>
            <div className="recent-list">
              {stats.recentActivity.map((activity, idx) => (
                <div key={activity.slug || idx} className="recent-item">
                  <span className="recent-title">{activity.title}</span>
                  <span className="recent-date">{activity.difficulty}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="leetcode-footer">
          Last synced: {stats.lastSyncedAt ? parseUtc(stats.lastSyncedAt).toLocaleString() : 'never'}
        </div>
      </div>
    </div>
  );
};

export default GfgStatsWidget;
