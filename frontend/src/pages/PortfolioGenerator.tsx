import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Globe, Download, Palette, Eye, Layout } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';
import './PortfolioGenerator.css';

interface IPortfolioSettings {
  theme: 'modern-dark' | 'minimal-light' | 'cyberpunk' | 'glassmorphism';
  primaryColor: string;
  fontFamily: 'Inter' | 'Roboto' | 'Outfit' | 'Fira Code';
  profilePictureUrl: string;
  heroSubtitle: string;
  bio: string;
  sectionVisibility: {
    showSkills: boolean;
    showProjects: boolean;
    showExperience: boolean;
    showEducation: boolean;
    showLeetCode: boolean;
    showGraph: boolean;
  };
}

const COLORS = ['#6366f1', '#10b981', '#3b82f6', '#f43f5e', '#8b5cf6'];

const PortfolioGenerator: React.FC = () => {
  const [settings, setSettings] = useState<IPortfolioSettings | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  const { token: contextToken } = useContext(AuthContext);

  const getAuthHeaders = () => {
    let t = contextToken;
    if (!t) {
      try {
        const storedInfo = localStorage.getItem('userInfo');
        if (storedInfo) t = JSON.parse(storedInfo).token;
      } catch (e) {}
    }
    return { headers: { Authorization: `Bearer ${t || ''}` } };
  };

  useEffect(() => {
    fetchPreviewData();
  }, [contextToken]);

  const fetchPreviewData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/portfolio/preview`, getAuthHeaders());
      setSettings(res.data.settings);
      setPreviewData(res.data);
    } catch (err) {
      console.error('Error fetching portfolio preview data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      const res = await axios.put(`${API_BASE_URL}/api/portfolio/settings`, settings, getAuthHeaders());
      setSettings(res.data);
      setSaveStatus('Theme settings saved!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error('Error saving portfolio settings', err);
    }
  };

  const handleExportBundle = async () => {
    try {
      setExporting(true);
      const res = await axios.get(`${API_BASE_URL}/api/portfolio/export/bundle`, {
        ...getAuthHeaders(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `portfolio_bundle_index.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting bundle', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading || !settings || !previewData) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Portfolio Generator...</div>;
  }

  const { user, githubStats, intelligence } = previewData;
  const name = user?.name || 'Developer Name';
  const repos = githubStats?.repositories || [];
  const strengths = intelligence?.strengths || ['System Architecture', 'REST APIs', 'Full Stack Development', 'React', 'TypeScript', 'Node.js', 'MongoDB'];

  // Calculate live styles
  const isLight = settings.theme === 'minimal-light';
  const siteBg = isLight ? '#f8fafc' : settings.theme === 'cyberpunk' ? '#050510' : '#0f172a';
  const siteCard = isLight ? '#ffffff' : settings.theme === 'cyberpunk' ? '#12122a' : '#1e293b';
  const siteText = isLight ? '#0f172a' : settings.theme === 'cyberpunk' ? '#00ffcc' : '#f8fafc';
  const siteMuted = isLight ? '#64748b' : '#94a3b8';

  return (
    <div className="portfolio-gen-container">
      <div className="portfolio-header">
        <div className="portfolio-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Globe size={28} style={{ color: 'var(--primary)' }} />
            <h1>Developer Portfolio Studio</h1>
          </div>
          <p>Design, customize, and export a standalone responsive portfolio website driven by your synchronized data.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {saveStatus && <span style={{ color: '#10b981', fontWeight: 600 }}>{saveStatus}</span>}
          <button className="btn" style={{ backgroundColor: 'var(--bg-surface-hover)' }} onClick={handleSaveSettings}>
            Save Theme
          </button>
          <button
            className="btn"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', display: 'flex', gap: '0.5rem' }}
            onClick={handleExportBundle}
            disabled={exporting}
          >
            <Download size={18} />
            {exporting ? 'Bundling...' : 'Download Deployment HTML Bundle'}
          </button>
        </div>
      </div>

      <div className="portfolio-grid">
        {/* Left Column: Theme Customizer */}
        <div className="customizer-panel">
          <div className="customizer-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={18} style={{ color: 'var(--primary)' }} />
              <h3>Select Design Theme</h3>
            </div>
            <div className="theme-options">
              {(['modern-dark', 'minimal-light', 'cyberpunk', 'glassmorphism'] as const).map(th => (
                <div
                  key={th}
                  className={`theme-card ${settings.theme === th ? 'active' : ''}`}
                  onClick={() => setSettings({ ...settings, theme: th })}
                >
                  <span className="theme-name">{th.replace('-', ' ').toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="customizer-section">
            <h3>Primary Accent Color</h3>
            <div className="color-swatches">
              {COLORS.map(color => (
                <div
                  key={color}
                  className={`color-swatch ${settings.primaryColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSettings({ ...settings, primaryColor: color })}
                />
              ))}
            </div>
          </div>

          <div className="customizer-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layout size={18} style={{ color: 'var(--primary)' }} />
              <h3>Hero Subtitle & Bio</h3>
            </div>
            <input
              style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', color: 'white', fontSize: '0.85rem' }}
              value={settings.heroSubtitle}
              onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
              placeholder="Hero Subtitle"
            />
            <textarea
              rows={3}
              style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', color: 'white', fontSize: '0.85rem' }}
              value={settings.bio}
              onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
              placeholder="Developer Bio"
            />
          </div>

          <div className="customizer-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye size={18} style={{ color: 'var(--primary)' }} />
              <h3>Section Visibility</h3>
            </div>
            <div className="toggle-group">
              <div className="toggle-item">
                <span>Show Core Skills</span>
                <input
                  type="checkbox"
                  checked={settings.sectionVisibility.showSkills !== false}
                  onChange={(e) => setSettings({
                    ...settings,
                    sectionVisibility: { ...settings.sectionVisibility, showSkills: e.target.checked }
                  })}
                />
              </div>
              <div className="toggle-item">
                <span>Show Featured Projects</span>
                <input
                  type="checkbox"
                  checked={settings.sectionVisibility.showProjects !== false}
                  onChange={(e) => setSettings({
                    ...settings,
                    sectionVisibility: { ...settings.sectionVisibility, showProjects: e.target.checked }
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Webpage Live Viewport */}
        <div className="portfolio-preview-box">
          <div className="browser-bar">
            <div className="dots">
              <div className="dot dot-red"></div>
              <div className="dot dot-yellow"></div>
              <div className="dot dot-green"></div>
            </div>
            <div className="url-bar">https://{name.toLowerCase().replace(/\s+/g, '')}.developer.os/</div>
          </div>

          <div
            className="live-site-viewport"
            style={{
              backgroundColor: siteBg,
              color: siteText,
              fontFamily: settings.fontFamily || 'Inter'
            }}
          >
            {/* Hero Section */}
            <div className="site-hero">
              <div>
                <h1>Hello, I'm <span style={{ color: settings.primaryColor }}>{name}</span></h1>
                <p style={{ fontSize: '1.2rem', color: siteMuted }}>{settings.heroSubtitle}</p>
                <p style={{ fontSize: '0.95rem', color: siteMuted, maxWidth: '560px', marginTop: '0.5rem' }}>
                  {settings.bio || 'Passionate software engineer building scalable systems and intelligent applications.'}
                </p>
              </div>
              <img
                src={settings.profilePictureUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                alt={name}
                className="site-avatar"
                style={{ borderColor: settings.primaryColor }}
              />
            </div>

            {/* Skills Section */}
            {settings.sectionVisibility.showSkills !== false && (
              <div className="site-section">
                <h2 style={{ borderColor: settings.primaryColor }}>Core Competencies</h2>
                <div className="site-skills">
                  {strengths.map((sk: string, idx: number) => (
                    <div
                      key={idx}
                      className="site-skill-pill"
                      style={{ backgroundColor: siteCard, borderColor: settings.primaryColor }}
                    >
                      {sk}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects Section */}
            {settings.sectionVisibility.showProjects !== false && (
              <div className="site-section">
                <h2 style={{ borderColor: settings.primaryColor }}>Featured Projects</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {repos.slice(0, 4).map((repo: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: siteCard,
                        padding: '1.5rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '0.5rem' }}>
                        <span>{repo.name}</span>
                        <span style={{ color: '#eab308' }}>★ {repo.stars}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: siteMuted, marginBottom: '1rem' }}>
                        {repo.description || 'Engineered scalable full stack application.'}
                      </p>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {(repo.languages || [repo.language || 'Code']).slice(0, 3).map((l: string, i: number) => (
                          <span key={i} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(99,102,241,0.15)', color: settings.primaryColor }}>
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioGenerator;
