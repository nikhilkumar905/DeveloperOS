import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Github, Star, GitFork, GitPullRequest, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { API_BASE_URL, getErrorMessage, parseUtc } from '../lib/api';
import './GithubStatsWidget.css';

interface GithubStats {
  profile: {
    username: string;
    avatarUrl: string;
    publicRepos: number;
    followers: number;
  };
  repositories: Array<{
    name: string;
    url: string;
    stars: number;
    forks: number;
    language: string;
  }>;
  aggregatedStats: {
    totalPRs: number;
    totalIssues: number;
    totalStars: number;
  };
  topLanguages: Record<string, number>;
  lastSyncedAt: string;
}

const GithubStatsWidget: React.FC = () => {
  const { token } = React.useContext(AuthContext);
  const [stats, setStats] = useState<GithubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // True between the OAuth redirect and the first background sync finishing
  const [awaitingFirstSync, setAwaitingFirstSync] = useState(false);
  // Read the OAuth callback params once: StrictMode runs effects twice, and the first run clears the URL
  const [callbackParams] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('github_connected') || params.has('github_error')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    return { connected: params.get('github_connected') === 'true', failed: params.has('github_error') };
  });

  const fetchStats = useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/github/stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      // The API answers 200 with `null` when GitHub isn't connected
      const connected = !!response.data;
      setStats(response.data || null);
      setIsConnected(connected);
      setError(null);
      return connected;
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to fetch GitHub stats.'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (callbackParams.failed) {
      // Set after the fetch, which clears errors on success
      fetchStats().then(() => setError('GitHub connection failed. Please try again.'));
      return;
    }
    if (!callbackParams.connected) {
      fetchStats();
      return;
    }

    // Just came back from GitHub OAuth: the first sync runs in the background, so poll until it lands
    setAwaitingFirstSync(true);
    let attempts = 0;
    let cancelled = false;
    const poll = async () => {
      const connected = await fetchStats();
      if (cancelled) return;
      if (connected || ++attempts >= 30) {
        setAwaitingFirstSync(false);
        if (connected) window.dispatchEvent(new Event('personalos-integration-updated'));
        return;
      }
      setTimeout(poll, 3000);
    };
    poll();
    return () => { cancelled = true; };
  }, [token, fetchStats, callbackParams]);

  const handleConnect = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/github/auth-url`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to initiate GitHub connection.'));
    }
  };

  const handleDisconnect = async () => {
    if (!token) return;
    try {
      await axios.post(`${API_BASE_URL}/api/github/disconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsConnected(false);
      setStats(null);
      window.dispatchEvent(new Event('personalos-integration-updated'));
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to disconnect.'));
    }
  };

  const handleSync = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/github/sync`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
      setError(null);
      window.dispatchEvent(new Event('personalos-integration-updated'));
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to sync data.'));
    } finally {
      setSyncing(false);
    }
  };

  if (loading || awaitingFirstSync) {
    return (
      <div className="card widget-box github-widget loading">
        <RefreshCw className="spinner" /> {awaitingFirstSync ? 'GitHub connected — importing your repositories...' : 'Loading GitHub Stats...'}
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="card widget-box github-widget not-connected">
        <div className="widget-header">
          <h3>GitHub Integration</h3>
          <Github size={18} />
        </div>
        <div className="github-connect-content">
          <p>Connect your GitHub account to sync repositories and view your contribution statistics.</p>
          <button className="btn btn-primary" onClick={handleConnect}>
            <Github size={16} style={{ marginRight: '8px' }} /> Connect GitHub
          </button>
          {error && <p className="error-text"><AlertCircle size={14}/> {error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="card widget-box github-widget">
      <div className="widget-header">
        <h3>GitHub Stats</h3>
        <div className="github-actions">
          <button className="btn-icon-subtle" onClick={handleSync} disabled={syncing} title="Sync Now">
            <RefreshCw size={16} className={syncing ? 'spinner' : ''} />
          </button>
          <button className="btn-icon-subtle danger" onClick={handleDisconnect} title="Disconnect">
            <XCircle size={16} />
          </button>
        </div>
      </div>

      {error && <div className="error-banner"><AlertCircle size={14} /> {error}</div>}

      {stats && (
        <div className="github-stats-content">
          <div className="github-profile">
            <img src={stats.profile.avatarUrl} alt="Avatar" className="github-avatar" />
            <div className="github-user-info">
              <h4>{stats.profile.username}</h4>
              <span className="github-meta">{stats.profile.followers} Followers • {stats.profile.publicRepos} Repos</span>
            </div>
          </div>

          <div className="github-metrics-grid">
            <div className="github-metric">
              <Star size={16} className="metric-icon star" />
              <div className="metric-details">
                <span className="metric-value">{stats.aggregatedStats.totalStars}</span>
                <span className="metric-label">Stars Earned</span>
              </div>
            </div>
            <div className="github-metric">
              <GitPullRequest size={16} className="metric-icon pr" />
              <div className="metric-details">
                <span className="metric-value">{stats.aggregatedStats.totalPRs}</span>
                <span className="metric-label">Pull Requests</span>
              </div>
            </div>
            <div className="github-metric">
              <AlertCircle size={16} className="metric-icon issue" />
              <div className="metric-details">
                <span className="metric-value">{stats.aggregatedStats.totalIssues}</span>
                <span className="metric-label">Issues</span>
              </div>
            </div>
          </div>

          <div className="github-repos">
            <h5>Top Repositories</h5>
            <div className="repos-list">
              {stats.repositories.slice(0, 3).map((repo) => (
                <a key={repo.name} href={repo.url} target="_blank" rel="noopener noreferrer" className="repo-item">
                  <span className="repo-name">{repo.name}</span>
                  <div className="repo-stats">
                    <span className="repo-lang"><span className="lang-dot"></span>{repo.language}</span>
                    <span className="repo-stat"><Star size={12}/> {repo.stars}</span>
                    <span className="repo-stat"><GitFork size={12}/> {repo.forks}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
          
          <div className="github-footer">
            Last synced: {stats.lastSyncedAt ? parseUtc(stats.lastSyncedAt).toLocaleString() : 'never'}
          </div>
        </div>
      )}
    </div>
  );
};

export default GithubStatsWidget;
