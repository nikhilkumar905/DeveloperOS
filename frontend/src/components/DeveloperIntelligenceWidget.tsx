import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Brain, RefreshCw, Zap, TrendingUp, AlertTriangle, Target, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';
import './DeveloperIntelligenceWidget.css';

interface IntelligenceData {
  scores: {
    dsa: number;
    frontend: number;
    backend: number;
    fullStack: number;
    consistency: number;
    productivity: number;
    interviewReadiness: number;
    overallScore: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  roadmap: string[];
  lastCalculatedAt: string;
}

const ProgressBar = ({ label, score, colorClass }: { label: string, score: number, colorClass: string }) => (
  <div className="score-row">
    <div className="score-label">{label}</div>
    <div className="score-bar-bg">
      <div 
        className={`score-bar-fill ${colorClass}`} 
        style={{ width: `${score}%` }} 
      />
    </div>
    <div className="score-value">{score}</div>
  </div>
);

const DeveloperIntelligenceWidget: React.FC = () => {
  const { token } = React.useContext(AuthContext);
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchInsights = useCallback(async (isRefresh = false) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const url = isRefresh 
        ? `${API_BASE_URL}/api/analytics/insights/refresh`
        : `${API_BASE_URL}/api/analytics/insights`;
      const method = isRefresh ? 'post' : 'get';
      
      const response = await axios({
        method,
        url,
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load Developer Intelligence insights.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  if (!data && !loading && !error) return null;

  return (
    <div className="intelligence-widget">
      <div className="intelligence-header">
        <h2><Brain size={24} color="#a855f7" /> Developer Intelligence</h2>
        <button 
          onClick={() => fetchInsights(true)} 
          className="refresh-btn" 
          disabled={loading}
          title="Refresh Insights"
        >
          <RefreshCw size={18} className={loading ? 'lucide-spin' : ''} />
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {data && (
        <>
          <div className="overall-score-container">
            <div className="overall-score-circle" style={{ borderColor: `rgba(59, 130, 246, ${data.scores.overallScore / 100})` }}>
              {data.scores.overallScore}
            </div>
            <div className="overall-score-label">Developer Score</div>
          </div>

          <div className="intelligence-grid">
            <div className="score-card">
              <h3>Technical Skills</h3>
              <ProgressBar label="DSA" score={data.scores.dsa} colorClass="fill-blue" />
              <ProgressBar label="Frontend" score={data.scores.frontend} colorClass="fill-green" />
              <ProgressBar label="Backend" score={data.scores.backend} colorClass="fill-purple" />
              <ProgressBar label="Full Stack" score={data.scores.fullStack} colorClass="fill-yellow" />
            </div>
            <div className="score-card">
              <h3>Performance</h3>
              <ProgressBar label="Consistency" score={data.scores.consistency} colorClass="fill-cyan" />
              <ProgressBar label="Productivity" score={data.scores.productivity} colorClass="fill-green" />
              <ProgressBar label="Interview Ready" score={data.scores.interviewReadiness} colorClass="fill-red" />
            </div>
          </div>

          <div className="insights-section">
            <div className="insight-list strengths">
              <h3><Zap size={16} /> Key Strengths</h3>
              <ul>
                {data.strengths.length > 0 ? data.strengths.map((s, i) => (
                  <li key={i}><CheckCircle2 size={16} color="#10b981" /> {s}</li>
                )) : <li>No significant strengths detected yet.</li>}
              </ul>
            </div>
            <div className="insight-list weaknesses">
              <h3><AlertTriangle size={16} /> Areas to Improve</h3>
              <ul>
                {data.weaknesses.length > 0 ? data.weaknesses.map((w, i) => (
                  <li key={i}><AlertTriangle size={16} color="#f43f5e" /> {w}</li>
                )) : <li>Looking good! No major weaknesses detected.</li>}
              </ul>
            </div>
          </div>

          <div className="roadmap-section">
            <h3><Target size={20} /> Recommended Roadmap</h3>
            {data.roadmap.length > 0 ? (
              data.roadmap.map((item, index) => (
                <div className="roadmap-item" key={index}>
                  <div className="roadmap-item-icon">{index + 1}</div>
                  <div className="roadmap-item-content">
                    {item}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: '#94a3b8' }}>Connect GitHub and LeetCode to generate a roadmap.</div>
            )}
          </div>
          
          {data.recommendations.length > 0 && (
            <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#10b981', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
               <TrendingUp size={20} />
               <div>{data.recommendations[0]}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeveloperIntelligenceWidget;
