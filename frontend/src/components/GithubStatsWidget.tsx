import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Github, Star, GitFork, GitPullRequest, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
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

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get('http://localhost:6500/api/github/stats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setStats(response.data);
      setIsConnected(true);
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
        setIsConnected(false);
      } else {
        setError('Failed to fetch GitHub stats.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchStats();
      
      // Check for callback params
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('github_connected') === 'true') {
        window.history.replaceState({}, document.title, window.location.pathname);
        fetchStats();
      }
    }
  }, [token, fetchStats]);

  const handleConnect = async () => {
    if (!token) return;
    try {
      const res = await axios.get('http://localhost:6500/api/github/auth-url', {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      setError('Failed to initiate GitHub connection.');
    }
  };

  const handleDisconnect = async () => {
    if (!token) return;
    try {
      await axios.post('http://localhost:6500/api/github/disconnect', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsConnected(false);
      setStats(null);
    } catch (err) {
      console.error(err);
      setError('Failed to disconnect.');
    }
  };

  const handleSync = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      const res = await axios.post('http://localhost:6500/api/github/sync', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to sync data.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="card widget-box github-widget loading"><RefreshCw className="spinner" /> Loading GitHub Stats...</div>;
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
            Last synced: {new Date(stats.lastSyncedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default GithubStatsWidget;
