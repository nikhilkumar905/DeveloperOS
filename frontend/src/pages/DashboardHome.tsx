import React, { useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Github, Code2, GitBranch, Bell, Calendar, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import CreateGoalModal from '../components/CreateGoalModal';
import { WidgetRegistry } from '../components/WidgetRegistry';
import ActivityWidget from '../components/ActivityWidget';
import './DashboardHome.css';

interface Stats {
  githubUsername: string;
  leetcodeUsername: string;
  leetcodeStats?: {
    solvedTotal: number;
    solvedEasy: number;
    solvedMedium: number;
    solvedHard: number;
  };
  activeProjectsCount: number;
}

interface Goal {
  _id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  status: 'active' | 'completed' | 'failed';
}

interface NotificationItem {
  _id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
}

interface TimelineEvent {
  _id: string;
  title: string;
  description: string;
  type: 'github' | 'leetcode' | 'milestone';
  timestamp: string;
}

const DashboardHome: React.FC = () => {
  const { user, token, isLoading: isAuthLoading } = useContext(AuthContext);
  const [stats, setStats] = useState<Stats | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [statsRes, goalsRes, notifyRes, timelineRes] = await Promise.all([
        axios.get('http://localhost:6500/api/dashboard/stats', config),
        axios.get('http://localhost:6500/api/dashboard/goals', config),
        axios.get('http://localhost:6500/api/dashboard/notifications', config),
        axios.get('http://localhost:6500/api/dashboard/timeline', config)
      ]);

      setStats(statsRes.data);
      setGoals(goalsRes.data);
      setNotifications(notifyRes.data);
      setTimeline(timelineRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token, fetchDashboardData]);

  const handleCreateGoal = async (goalData: { title: string; targetValue: number; unit: string; deadline: string }) => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('http://localhost:6500/api/dashboard/goals', goalData, config);
      fetchDashboardData();
    } catch (err) {
      console.error('Error creating goal:', err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`http://localhost:6500/api/dashboard/notifications/${id}/read`, {}, config);
      setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  if (loading || isAuthLoading) {
    return <div className="loading-state">Loading dashboard resources...</div>;
  }

  return (
    <div className="dashboard-grid animate-fade-in">
      <div style={{ marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Welcome back, {user?.name || 'Developer'}! 👋</h2>
        <p style={{ color: 'var(--text-muted)' }}>Here is your dashboard overview for today.</p>
      </div>
      {/* Upper Stats Row */}
      <div className="stats-row">
        <div className="card glass-panel stats-card">
          <div className="stats-icon github-icon">
            <Github size={24} />
          </div>
          <div className="stats-info">
            <div className="stats-label">GitHub Integration</div>
            <div className="stats-value">{stats?.githubUsername}</div>
          </div>
        </div>

        <div className="card glass-panel stats-card">
          <div className="stats-icon leetcode-icon">
            <Code2 size={24} />
          </div>
          <div className="stats-info">
            <div className="stats-label">LeetCode Progress</div>
            <div className="stats-value">
              {stats?.leetcodeStats?.solvedTotal || 0} Solved
            </div>
            <div className="stats-subtext">
              E: {stats?.leetcodeStats?.solvedEasy || 0} | M: {stats?.leetcodeStats?.solvedMedium || 0} | H: {stats?.leetcodeStats?.solvedHard || 0}
            </div>
          </div>
        </div>

        <div className="card glass-panel stats-card">
          <div className="stats-icon projects-icon">
            <GitBranch size={24} />
          </div>
          <div className="stats-info">
            <div className="stats-label">Active Projects</div>
            <div className="stats-value">{stats?.activeProjectsCount}</div>
          </div>
        </div>
      </div>

      {/* Full Width Widgets */}
      {WidgetRegistry.filter(w => w.region === 'full').map(Widget => (
        <Widget.component key={Widget.id} />
      ))}

      {/* Main Content Layout */}
      <div className="dashboard-layout-body">
        
        {/* Left Side: Goals & Notifications */}
        <div className="dashboard-main-left">
          
          {/* Goals Widget */}
          <div className="card widget-box">
            <div className="widget-header">
              <h3>Active Goals</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsGoalModalOpen(true)}>
                <Plus size={16} /> Add Goal
              </button>
            </div>
            
            <div className="goals-list">
              {goals.length === 0 ? (
                <div className="empty-state">No goals set. Create one to keep track of your metrics!</div>
              ) : (
                goals.map(goal => {
                  const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                  return (
                    <div key={goal._id} className="goal-item">
                      <div className="goal-info">
                        <span className="goal-title">{goal.title}</span>
                        <span className="goal-progress-text">{goal.currentValue}/{goal.targetValue} {goal.unit}</span>
                      </div>
                      <div className="goal-progress-bar">
                        <div className="goal-progress-fill" style={{ width: `${percent}%` }}></div>
                      </div>
                      <div className="goal-meta">
                        <span>Target: {new Date(goal.deadline).toLocaleDateString()}</span>
                        <span className={`goal-status status-${goal.status}`}>{goal.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Notifications Panel */}
          <div className="card widget-box">
            <div className="widget-header">
              <h3>Notification Center</h3>
              <Bell size={18} className="text-muted" />
            </div>
            
            <div className="notifications-list">
              {notifications.length === 0 ? (
                <div className="empty-state">No notifications.</div>
              ) : (
                notifications.map(n => (
                  <div key={n._id} className={`notification-item ${n.read ? 'read' : 'unread'} type-${n.type}`}>
                    <div className="notification-icon">
                      {n.type === 'warning' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    </div>
                    <div className="notification-details">
                      <p>{n.message}</p>
                      {!n.read && (
                        <button className="mark-read-btn" onClick={() => handleMarkAsRead(n._id)}>Mark as read</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Activity Timeline */}
        <div className="dashboard-main-right">
          {WidgetRegistry.filter(w => w.region !== 'full').map(Widget => (
            <Widget.component key={Widget.id} />
          ))}
          
          <div className="card widget-box timeline-widget" style={{ marginTop: '1.25rem' }}>
            <div className="widget-header">
              <h3>Activity Timeline</h3>
              <Calendar size={18} className="text-muted" />
            </div>

            <div className="timeline-container">
              {timeline.length === 0 ? (
                <div className="empty-state">Your activity events will show up here.</div>
              ) : (
                timeline.map(event => (
                  <div key={event._id} className="timeline-item">
                    <div className={`timeline-badge badge-${event.type}`}></div>
                    <div className="timeline-content">
                      <h4>{event.title}</h4>
                      <p>{event.description}</p>
                      <span className="timeline-time">{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Widget — Full Width */}
      <ActivityWidget />

      <CreateGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSubmit={handleCreateGoal}
      />
    </div>
  );
};

export default DashboardHome;
