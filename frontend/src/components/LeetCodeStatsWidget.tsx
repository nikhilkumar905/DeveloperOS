import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Code2, Target, Trophy, AlertCircle, RefreshCw, XCircle, CheckCircle2 } from 'lucide-react';
import './LeetCodeStatsWidget.css';

interface LeetCodeStats {
  username: string;
  stats: {
    solvedTotal: number;
    solvedEasy: number;
    solvedMedium: number;
    solvedHard: number;
    contestRating: number;
    badges: number;
    streak: number;
    submissions: number;
    recentActivity: Array<{
      title: string;
      date: string;
      difficulty: string;
    }>;
    lastSyncedAt: string;
  };
}

const LeetCodeStatsWidget: React.FC = () => {
  const { token } = React.useContext(AuthContext);
  const [statsData, setStatsData] = useState<LeetCodeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get('http://localhost:6500/api/leetcode/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.data) {
        setIsConnected(false);
        setStatsData(null);
      } else {
        setStatsData(response.data);
        setIsConnected(true);
      }
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load LeetCode stats.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token, fetchStats]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !usernameInput.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:6500/api/leetcode/connect', 
        { username: usernameInput.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatsData({ username: usernameInput.trim(), stats: res.data });
      setIsConnected(true);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to connect LeetCode account.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!token) return;
    try {
      await axios.post('http://localhost:6500/api/leetcode/disconnect', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsConnected(false);
      setStatsData(null);
      setUsernameInput('');
    } catch (err) {
      console.error(err);
      setError('Failed to disconnect.');
    }
  };

  const handleSync = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      const res = await axios.post('http://localhost:6500/api/leetcode/sync', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsData) {
        setStatsData({ ...statsData, stats: res.data });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to sync data.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="card widget-box leetcode-widget loading"><RefreshCw className="spinner" /> Loading LeetCode Stats...</div>;
  }

  if (!isConnected) {
    return (
      <div className="card widget-box leetcode-widget not-connected">
        <div className="widget-header">
          <h3>LeetCode Integration</h3>
          <Code2 size={18} />
        </div>
        <div className="leetcode-connect-content">
          <p>Connect your LeetCode account to track your problem-solving progress and contest ratings.</p>
          <form onSubmit={handleConnect} className="leetcode-connect-form">
            <input 
              type="text" 
              className="input-field" 
              placeholder="LeetCode Username" 
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }}>
              <Code2 size={16} style={{ marginRight: '8px' }} /> Connect Account
            </button>
          </form>
          {error && <p className="error-text"><AlertCircle size={14}/> {error}</p>}
        </div>
      </div>
    );
  }

  const { stats } = statsData!;

  return (
    <div className="card widget-box leetcode-widget" style={{ marginTop: '1.25rem' }}>
      <div className="widget-header">
        <h3>LeetCode Stats <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>@{statsData!.username}</span></h3>
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
            <CheckCircle2 size={16} className="metric-icon solved" />
            <div className="metric-details">
              <span className="metric-value">{stats.solvedTotal}</span>
              <span className="metric-label">Total Solved</span>
            </div>
          </div>
          <div className="leetcode-metric">
            <Target size={16} className="metric-icon rating" />
            <div className="metric-details">
              <span className="metric-value">{stats.contestRating || 'N/A'}</span>
              <span className="metric-label">Contest Rating</span>
            </div>
          </div>
          <div className="leetcode-metric">
            <Trophy size={16} className="metric-icon badge-icon" />
            <div className="metric-details">
              <span className="metric-value">{stats.badges}</span>
              <span className="metric-label">Badges</span>
            </div>
          </div>
        </div>

        <div className="leetcode-difficulty-bar">
          <div className="difficulty-segment easy" style={{ flex: stats.solvedEasy || 1 }} title={`Easy: ${stats.solvedEasy}`}></div>
          <div className="difficulty-segment medium" style={{ flex: stats.solvedMedium || 1 }} title={`Medium: ${stats.solvedMedium}`}></div>
          <div className="difficulty-segment hard" style={{ flex: stats.solvedHard || 1 }} title={`Hard: ${stats.solvedHard}`}></div>
        </div>
        <div className="leetcode-difficulty-labels">
          <span className="easy-label">Easy {stats.solvedEasy}</span>
          <span className="medium-label">Med {stats.solvedMedium}</span>
          <span className="hard-label">Hard {stats.solvedHard}</span>
        </div>

        {stats.recentActivity && stats.recentActivity.length > 0 && (
          <div className="leetcode-recent">
            <h5>Recent Submissions</h5>
            <div className="recent-list">
              {stats.recentActivity.map((activity, idx) => (
                <div key={idx} className="recent-item">
                  <span className="recent-title">{activity.title}</span>
                  <span className="recent-date">{new Date(activity.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="leetcode-footer">
          Last synced: {new Date(stats.lastSyncedAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default LeetCodeStatsWidget;
