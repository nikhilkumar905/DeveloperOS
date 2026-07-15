import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';
import { Calendar } from 'lucide-react';
import './ActivityHeatmapWidget.css';

interface HeatmapSession {
  date: string;
  totalTimeMs: number;
  problemsSolved: number;
}

const ActivityHeatmapWidget: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [sessions, setSessions] = useState<Map<string, HeatmapSession>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchHeatmap = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/activity/heatmap`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const map = new Map();
        res.data.sessions.forEach((s: HeatmapSession) => {
          map.set(s.date, s);
        });
        setSessions(map);
      } catch (err) {
        console.error('Failed to fetch heatmap data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmap();
  }, [token]);

  // Generate 90 days grid
  const { weeks, monthLabels } = useMemo(() => {
    const days = 90;
    const today = new Date();
    const dateArray = [];

    // Generate dates from 90 days ago to today
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      dateArray.push(d);
    }

    // Align to start of the week (Sunday)
    const firstDay = dateArray[0];
    const emptyDaysAtStart = firstDay.getDay(); // 0 = Sunday

    const weeksArr: Date[][] = [];
    let currentWeek: Date[] = Array(emptyDaysAtStart).fill(null);

    const monthTracker: { month: string; weeksCount: number }[] = [];
    let lastMonth = -1;

    dateArray.forEach((d) => {
      currentWeek.push(d);

      // Track month labels when a new month starts in the middle of a week
      if (d.getMonth() !== lastMonth) {
        monthTracker.push({
          month: d.toLocaleDateString(undefined, { month: 'short' }),
          weeksCount: 0
        });
        lastMonth = d.getMonth();
      }

      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        monthTracker[monthTracker.length - 1].weeksCount++;
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(new Date(0)); // Fill with invalid dates
      weeksArr.push(currentWeek);
      monthTracker[monthTracker.length - 1].weeksCount++;
    }

    return { weeks: weeksArr, monthLabels: monthTracker };
  }, []);

  const getLevel = (ms: number) => {
    const hours = ms / 3600000;
    if (hours === 0) return 0;
    if (hours < 1) return 1;
    if (hours < 3) return 2;
    if (hours < 5) return 3;
    return 4;
  };

  const formatDuration = (ms: number): string => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}m`;
    if (ms > 0) return `${Math.floor(ms / 1000)}s`;
    return '0m';
  };

  return (
    <div className="card widget-box heatmap-widget">
      <div className="heatmap-header">
        <h3><Calendar size={20} className="text-primary" /> 90-Day Heatmap</h3>
      </div>

      {loading ? (
        <div className="loading-state" style={{ minHeight: '150px' }}>Loading calendar...</div>
      ) : (
        <div className="heatmap-container">
          <div className="heatmap-months">
            {monthLabels.map((m, i) => (
              <div key={i} style={{ width: `${m.weeksCount * 18}px`, overflow: 'hidden' }}>
                {m.month}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex' }}>
            <div className="heatmap-y-axis">
              <div className="heatmap-y-label">Sun</div>
              <div className="heatmap-y-label"></div>
              <div className="heatmap-y-label">Tue</div>
              <div className="heatmap-y-label"></div>
              <div className="heatmap-y-label">Thu</div>
              <div className="heatmap-y-label"></div>
              <div className="heatmap-y-label">Sat</div>
            </div>

            <div className="heatmap-grid">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="heatmap-week">
                  {week.map((day, dIdx) => {
                    if (!day || day.getTime() === 0) {
                      return <div key={dIdx} style={{ width: 14, height: 14 }} />;
                    }
                    const dateStr = day.toISOString().split('T')[0];
                    const session = sessions.get(dateStr);
                    const level = getLevel(session?.totalTimeMs || 0);
                    const title = `${dateStr}: ${formatDuration(session?.totalTimeMs || 0)} coding, ${session?.problemsSolved || 0} problems solved`;

                    return (
                      <div
                        key={dIdx}
                        className={`heatmap-day level-${level}`}
                        title={title}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="heatmap-legend">
            Less
            <div className="heatmap-legend-item level-0" />
            <div className="heatmap-legend-item level-1" />
            <div className="heatmap-legend-item level-2" />
            <div className="heatmap-legend-item level-3" />
            <div className="heatmap-legend-item level-4" />
            More
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityHeatmapWidget;
