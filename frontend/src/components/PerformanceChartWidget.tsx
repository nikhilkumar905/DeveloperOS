import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';
import { TrendingUp } from 'lucide-react';
import './PerformanceChartWidget.css';

interface WeeklyDay {
  date: string;
  totalTimeMs: number;
  problemsSolved: number;
}

const formatDuration = (ms: number): string => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(ms / 1000)}s`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="performance-tooltip">
        <div className="performance-tooltip-date">{new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
        <div className="performance-tooltip-stat">
          <span style={{ color: payload[0].color }}>Coding Time:</span>
          <span className="performance-tooltip-value" style={{ color: payload[0].color }}>
            {formatDuration(payload[0].value * 3600000)}
          </span>
        </div>
        <div className="performance-tooltip-stat">
          <span style={{ color: payload[1].color }}>Problems Solved:</span>
          <span className="performance-tooltip-value" style={{ color: payload[1].color }}>
            {payload[1].value}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const PerformanceChartWidget: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchWeekly = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/activity/weekly`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const formattedData = res.data.days.map((d: WeeklyDay) => ({
          date: d.date,
          // Convert ms to hours for the chart
          hoursCoded: Number((d.totalTimeMs / 3600000).toFixed(2)),
          problemsSolved: d.problemsSolved || 0,
          rawMs: d.totalTimeMs
        }));
        setData(formattedData);
      } catch (err) {
        console.error('Failed to fetch performance data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWeekly();
  }, [token]);

  return (
    <div className="card widget-box performance-widget">
      <div className="performance-header">
        <h3><TrendingUp size={20} className="text-primary" /> Performance Trends</h3>
      </div>
      
      {loading ? (
        <div className="loading-state">Loading performance data...</div>
      ) : data.length === 0 ? (
        <div className="empty-state">No coding data found for the last 7 days.</div>
      ) : (
        <div className="performance-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProblems" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short' })}
                stroke="var(--text-muted)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                yAxisId="left" 
                stroke="var(--text-muted)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="var(--text-muted)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dx={10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="hoursCoded" 
                stroke="#6366f1" 
                fillOpacity={1} 
                fill="url(#colorHours)" 
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
              />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="problemsSolved" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorProblems)"
                activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default PerformanceChartWidget;
