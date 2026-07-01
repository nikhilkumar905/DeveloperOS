import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FileText, Sparkles, Download, Plus, Trash2, Award } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';
import './ResumeStudio.css';

interface IResumeProfile {
  _id?: string;
  personalInfo: {
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    location: string;
    githubUrl: string;
    linkedinUrl: string;
    websiteUrl: string;
    customLinks?: Array<{ label: string; url: string }>;
  };
  careerObjective: string;
  targetRole: string;
  selectedTemplate: string;
  skills: {
    technical: string[];
    frameworks: string[];
    tools: string[];
    soft: string[];
  };
  categorizedSkills?: Array<{
    category: string;
    skills: string[];
  }>;
  experience: Array<{
    role: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    bullets: string[];
    liveUrl?: string;
    githubUrl?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string;
    gpa?: string;
    highlights?: string[];
  }>;
  hackathons?: Array<{
    name: string;
    achievement?: string;
    date?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    credentialUrl?: string;
  }>;
  customSections?: Array<{
    title: string;
    items: Array<{
      title: string;
      subtitle?: string;
      date?: string;
      bullets?: string[];
    }>;
  }>;
  atsScore: number;
  atsSuggestions: string[];
}

const ResumeStudio: React.FC = () => {
  const [profile, setProfile] = useState<IResumeProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inferring, setInferring] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'skills' | 'experience' | 'projects' | 'education' | 'hackathons' | 'certifications' | 'custom'>('personal');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [downloadFilename, setDownloadFilename] = useState<string>('');
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [showRepoModal, setShowRepoModal] = useState<boolean>(false);

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
    fetchProfile();
    fetchGithubRepos();
  }, [contextToken]);

  const fetchGithubRepos = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/github/stats`, getAuthHeaders());
      if (res.data?.repositories) {
        setGithubRepos(res.data.repositories);
      }
    } catch (e) {
      console.log('GitHub stats not found or not connected.');
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/resume/profile`, getAuthHeaders());
      const p: IResumeProfile = res.data;

      // Ensure categorizedSkills initialized
      if (!p.categorizedSkills || p.categorizedSkills.length === 0) {
        p.categorizedSkills = [
          { category: 'Programming Languages', skills: p.skills?.technical?.length > 0 ? p.skills.technical : ['C++', 'Python', 'Java', 'JavaScript'] },
          { category: 'Frontend', skills: ['React', 'HTML5', 'CSS3', 'Tailwind CSS'] },
          { category: 'Backend & APIs', skills: ['Node.js', 'Express.js', 'FastAPI', 'RESTful APIs', 'JWT Authentication'] },
          { category: 'Databases', skills: ['MongoDB', 'MySQL'] },
          { category: 'AI / ML', skills: ['Scikit-learn', 'PyTorch', 'NumPy', 'Pandas', 'Transformer Models', 'Hugging Face Trainer'] },
          { category: 'Core Computer Science', skills: ['Data Structures & Algorithms', 'Object-Oriented Programming (OOP)', 'Database Management Systems (DBMS)', 'Operating Systems', 'Computer Networks'] },
          { category: 'Tools and Platforms', skills: p.skills?.tools?.length > 0 ? p.skills.tools : ['Git', 'GitHub', 'VS Code', 'Docker', 'Vercel', 'Render'] }
        ];
      }
      if (!p.hackathons) p.hackathons = [];
      if (!p.certifications) p.certifications = [];
      if (!p.customSections) p.customSections = [];

      setProfile(p);
      if (p.personalInfo?.fullName) {
        setDownloadFilename(`${p.personalInfo.fullName.replace(/\s+/g, '_')}_Resume`);
      }
    } catch (err) {
      console.error('Error fetching resume profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInfer = async () => {
    if (!profile) return;
    try {
      setInferring(true);
      const res = await axios.post(`${API_BASE_URL}/api/resume/infer`, { targetRole: profile.targetRole || 'Software Engineer' }, getAuthHeaders());
      setProfile(res.data.profile);
      setSaveStatus('Auto-inferred from GitHub & Knowledge Graph!');
      setTimeout(() => setSaveStatus(''), 4000);
    } catch (err) {
      console.error('Error inferring resume', err);
    } finally {
      setInferring(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      const res = await axios.put(`${API_BASE_URL}/api/resume/profile`, profile, getAuthHeaders());
      setProfile(res.data);
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error('Error saving profile', err);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExporting(true);
      const fname = downloadFilename.trim() || `${(profile?.personalInfo?.fullName || 'Developer').replace(/\s+/g, '_')}_Resume`;
      const cleanFname = fname.toLowerCase().endsWith('.pdf') ? fname : `${fname}.pdf`;
      const res = await axios.get(`${API_BASE_URL}/api/resume/export/pdf?filename=${encodeURIComponent(cleanFname)}`, {
        ...getAuthHeaders(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', cleanFname);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting PDF', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Resume Studio...</div>;
  }

  if (!profile) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Error loading resume profile.</div>;
  }

  return (
    <div className="resume-studio-container">
      <div className="resume-header">
        <div className="resume-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={28} style={{ color: 'var(--primary)' }} />
            <h1>Intelligent Resume Studio</h1>
          </div>
          <p>Classic 1-Page ATS-Optimized layout matching professional standards with full manual customization.</p>
        </div>
        <div className="resume-actions" style={{ flexWrap: 'wrap' }}>
          {saveStatus && <span style={{ color: '#10b981', alignSelf: 'center', fontWeight: 600 }}>{saveStatus}</span>}
          <button className="btn-infer" onClick={handleInfer} disabled={inferring}>
            <Sparkles size={18} />
            {inferring ? 'Inferring...' : 'Auto-Infer from GitHub'}
          </button>
          <button className="btn" style={{ backgroundColor: 'var(--bg-surface-hover)' }} onClick={handleSave}>
            Save Changes
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PDF Name:</span>
            <input
              type="text"
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.85rem', width: '150px', outline: 'none' }}
              value={downloadFilename}
              onChange={(e) => setDownloadFilename(e.target.value)}
              placeholder="Custom Filename"
            />
          </div>
          <button className="btn-export" onClick={handleExportPdf} disabled={exporting}>
            <Download size={18} />
            {exporting ? 'Exporting...' : 'Export 1-Page PDF'}
          </button>
        </div>
      </div>

      <div className="resume-grid">
        {/* Left Column: Editor & ATS Scorecard */}
        <div className="editor-panel">
          {/* ATS Scorecard */}
          <div className="ats-scorecard">
            <div className="ats-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={20} style={{ color: '#f59e0b' }} />
                <span style={{ fontWeight: 700 }}>ATS Compatibility Score</span>
              </div>
              <div className="ats-score-circle">
                <span className="score-num">{profile.atsScore || 85}%</span>
              </div>
            </div>
            <div className="ats-progress">
              <div className="ats-progress-bar" style={{ width: `${profile.atsScore || 85}%` }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
              <span>Target Role: <strong>{profile.targetRole}</strong></span>
              <span>Template: <strong>{profile.selectedTemplate}</strong></span>
            </div>
          </div>

          {/* Form Tabs */}
          <div className="form-tabs">
            <button className={`form-tab-btn ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>Personal Info</button>
            <button className={`form-tab-btn ${activeTab === 'experience' ? 'active' : ''}`} onClick={() => setActiveTab('experience')}>Experience</button>
            <button className={`form-tab-btn ${activeTab === 'education' ? 'active' : ''}`} onClick={() => setActiveTab('education')}>Education</button>
            <button className={`form-tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>Projects</button>
            <button className={`form-tab-btn ${activeTab === 'hackathons' ? 'active' : ''}`} onClick={() => setActiveTab('hackathons')}>Hackathons</button>
            <button className={`form-tab-btn ${activeTab === 'certifications' ? 'active' : ''}`} onClick={() => setActiveTab('certifications')}>Certifications</button>
            <button className={`form-tab-btn ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>Categorized Skills</button>
            <button className={`form-tab-btn ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => setActiveTab('custom')}>+ Custom Sections</button>
          </div>

          {/* Editor Form */}
          <div className="editor-form">
            {activeTab === 'personal' && (
              <>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={profile.personalInfo?.fullName || ''}
                    onChange={(e) => setProfile({ ...profile, personalInfo: { ...profile.personalInfo, fullName: e.target.value } })}
                  />
                </div>
                <div className="form-group">
                  <label>Professional Title</label>
                  <input
                    type="text"
                    value={profile.personalInfo?.jobTitle || ''}
                    onChange={(e) => setProfile({ ...profile, personalInfo: { ...profile.personalInfo, jobTitle: e.target.value } })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="text"
                      value={profile.personalInfo?.email || ''}
                      onChange={(e) => setProfile({ ...profile, personalInfo: { ...profile.personalInfo, email: e.target.value } })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={profile.personalInfo?.phone || ''}
                      onChange={(e) => setProfile({ ...profile, personalInfo: { ...profile.personalInfo, phone: e.target.value } })}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>LinkedIn URL</label>
                    <input
                      type="text"
                      value={profile.personalInfo?.linkedinUrl || ''}
                      onChange={(e) => setProfile({ ...profile, personalInfo: { ...profile.personalInfo, linkedinUrl: e.target.value } })}
                    />
                  </div>
                  <div className="form-group">
                    <label>GitHub URL</label>
                    <input
                      type="text"
                      value={profile.personalInfo?.githubUrl || ''}
                      onChange={(e) => setProfile({ ...profile, personalInfo: { ...profile.personalInfo, githubUrl: e.target.value } })}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Portfolio / Website URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={profile.personalInfo?.websiteUrl || ''}
                      onChange={(e) => setProfile({ ...profile, personalInfo: { ...profile.personalInfo, websiteUrl: e.target.value } })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      value={profile.personalInfo?.location || ''}
                      onChange={(e) => setProfile({ ...profile, personalInfo: { ...profile.personalInfo, location: e.target.value } })}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Additional Custom Links (LeetCode, Codeforces, Drive, etc.)</label>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: 'var(--primary)' }}
                      onClick={() => {
                        const updated = [...(profile.personalInfo?.customLinks || []), { label: 'LeetCode', url: 'https://leetcode.com/' }];
                        setProfile({ ...profile, personalInfo: { ...profile.personalInfo, customLinks: updated } });
                      }}
                    >
                      + Add Link
                    </button>
                  </div>
                  {(profile.personalInfo?.customLinks || []).map((link, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                      <input
                        style={{ width: '130px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.4rem', color: 'white', fontSize: '0.85rem' }}
                        placeholder="Label (e.g. LeetCode)"
                        value={link.label}
                        onChange={(e) => {
                          const updated = [...(profile.personalInfo?.customLinks || [])];
                          updated[idx].label = e.target.value;
                          setProfile({ ...profile, personalInfo: { ...profile.personalInfo, customLinks: updated } });
                        }}
                      />
                      <input
                        style={{ flex: 1, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.4rem', color: 'white', fontSize: '0.85rem' }}
                        placeholder="URL (https://...)"
                        value={link.url}
                        onChange={(e) => {
                          const updated = [...(profile.personalInfo?.customLinks || [])];
                          updated[idx].url = e.target.value;
                          setProfile({ ...profile, personalInfo: { ...profile.personalInfo, customLinks: updated } });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (profile.personalInfo?.customLinks || []).filter((_, i) => i !== idx);
                          setProfile({ ...profile, personalInfo: { ...profile.personalInfo, customLinks: updated } });
                        }}
                        style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="form-group">
                  <label>Professional Summary / Objective</label>
                  <textarea
                    rows={3}
                    value={profile.careerObjective || ''}
                    onChange={(e) => setProfile({ ...profile, careerObjective: e.target.value })}
                  />
                </div>
              </>
            )}

            {activeTab === 'experience' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Work Experience</h3>
                  <button
                    className="btn"
                    style={{ backgroundColor: 'var(--primary)', padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                    onClick={() => {
                      const newExp = [...(profile.experience || []), {
                        role: 'Software Developer Intern',
                        company: 'Tech Corp',
                        location: 'Remote',
                        startDate: 'May 2025',
                        endDate: 'July 2025',
                        current: false,
                        bullets: ['Automated business workflows reducing processing latency by 35%.']
                      }];
                      setProfile({ ...profile, experience: newExp });
                    }}
                  >
                    <Plus size={14} style={{ marginRight: '4px' }} /> Add Experience
                  </button>
                </div>
                {(profile.experience || []).map((exp, idx) => (
                  <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        style={{ fontWeight: 700, flex: 1 }}
                        placeholder="Role (e.g. Salesforce Intern)"
                        value={exp.role}
                        onChange={(e) => {
                          const updated = [...profile.experience];
                          updated[idx].role = e.target.value;
                          setProfile({ ...profile, experience: updated });
                        }}
                      />
                      <input
                        style={{ flex: 1 }}
                        placeholder="Company (e.g. SmartBridge)"
                        value={exp.company}
                        onChange={(e) => {
                          const updated = [...profile.experience];
                          updated[idx].company = e.target.value;
                          setProfile({ ...profile, experience: updated });
                        }}
                      />
                      <button onClick={() => {
                        const updated = profile.experience.filter((_, i) => i !== idx);
                        setProfile({ ...profile, experience: updated });
                      }} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        style={{ flex: 1, fontSize: '0.85rem' }}
                        placeholder="Date Range (e.g. May 2025 – July 2025)"
                        value={exp.startDate}
                        onChange={(e) => {
                          const updated = [...profile.experience];
                          updated[idx].startDate = e.target.value;
                          setProfile({ ...profile, experience: updated });
                        }}
                      />
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Bullet Points (one per line)</label>
                      <textarea
                        rows={3}
                        style={{ width: '100%', marginTop: '0.25rem' }}
                        value={(exp.bullets || []).join('\n')}
                        onChange={(e) => {
                          const updated = [...profile.experience];
                          updated[idx].bullets = e.target.value.split('\n').filter(Boolean);
                          setProfile({ ...profile, experience: updated });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'education' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Education</h3>
                  <button
                    className="btn"
                    style={{ backgroundColor: 'var(--primary)', padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                    onClick={() => {
                      const newEdu = [...(profile.education || []), {
                        institution: 'SRM University AP',
                        degree: 'B.Tech',
                        fieldOfStudy: 'Computer Science Engineering',
                        startYear: '2023',
                        endYear: 'Present',
                        gpa: '8.51/10',
                        highlights: ['Andhra Pradesh, India']
                      }];
                      setProfile({ ...profile, education: newEdu });
                    }}
                  >
                    <Plus size={14} style={{ marginRight: '4px' }} /> Add Education
                  </button>
                </div>
                {(profile.education || []).map((edu, idx) => (
                  <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        style={{ fontWeight: 700, flex: 1 }}
                        placeholder="Institution (e.g. SRM University AP)"
                        value={edu.institution}
                        onChange={(e) => {
                          const updated = [...profile.education];
                          updated[idx].institution = e.target.value;
                          setProfile({ ...profile, education: updated });
                        }}
                      />
                      <input
                        style={{ flex: 1 }}
                        placeholder="Location (e.g. Andhra Pradesh, India)"
                        value={edu.highlights && edu.highlights[0] ? edu.highlights[0] : ''}
                        onChange={(e) => {
                          const updated = [...profile.education];
                          updated[idx].highlights = [e.target.value];
                          setProfile({ ...profile, education: updated });
                        }}
                      />
                      <button onClick={() => {
                        const updated = profile.education.filter((_, i) => i !== idx);
                        setProfile({ ...profile, education: updated });
                      }} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        style={{ flex: 1, fontSize: '0.85rem' }}
                        placeholder="Degree (e.g. B.Tech in Computer Science Engineering)"
                        value={edu.degree}
                        onChange={(e) => {
                          const updated = [...profile.education];
                          updated[idx].degree = e.target.value;
                          setProfile({ ...profile, education: updated });
                        }}
                      />
                      <input
                        style={{ width: '150px', fontSize: '0.85rem' }}
                        placeholder="Years (e.g. 2023 – Present)"
                        value={edu.endYear ? `${edu.startYear} – ${edu.endYear}` : edu.startYear}
                        onChange={(e) => {
                          const parts = e.target.value.split('–').map(s => s.trim());
                          const updated = [...profile.education];
                          updated[idx].startYear = parts[0] || '';
                          updated[idx].endYear = parts[1] || '';
                          setProfile({ ...profile, education: updated });
                        }}
                      />
                    </div>
                    <div>
                      <input
                        style={{ width: '100%', fontSize: '0.85rem' }}
                        placeholder="Cumulative GPA (e.g. 8.51/10)"
                        value={edu.gpa || ''}
                        onChange={(e) => {
                          const updated = [...profile.education];
                          updated[idx].gpa = e.target.value;
                          setProfile({ ...profile, education: updated });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'projects' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3>Technical Projects</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {githubRepos.length > 0 && (
                      <button
                        className="btn"
                        style={{ backgroundColor: '#10b981', padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                        onClick={() => setShowRepoModal(!showRepoModal)}
                      >
                        ⚡ Import from GitHub ({githubRepos.length})
                      </button>
                    )}
                    <button
                      className="btn"
                      style={{ backgroundColor: 'var(--primary)', padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                      onClick={() => {
                        const newProj = [...(profile.projects || []), {
                          name: 'New Project',
                          description: '',
                          technologies: ['React', 'Node.js', 'TypeScript'],
                          bullets: ['Developed full-stack web application with secure authentication.'],
                          githubUrl: '',
                          liveUrl: ''
                        }];
                        setProfile({ ...profile, projects: newProj });
                      }}
                    >
                      <Plus size={14} style={{ marginRight: '4px' }} /> Add Project
                    </button>
                  </div>
                </div>

                {showRepoModal && githubRepos.length > 0 && (
                  <div style={{ padding: '1rem', background: '#1e293b', border: '1px solid #3b82f6', borderRadius: '8px', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#60a5fa' }}>Select a GitHub Repository to Import:</span>
                      <button onClick={() => setShowRepoModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {githubRepos.map((repo, rIdx) => (
                        <div key={rIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#0f172a', borderRadius: '4px' }}>
                          <div>
                            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{repo.name}</span>
                            <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#e2e8f0', background: '#334155', padding: '2px 6px', borderRadius: '4px' }}>{repo.language || 'Code'}</span>
                            {repo.stars > 0 && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#fbbf24' }}>⭐ {repo.stars}</span>}
                          </div>
                          <button
                            className="btn"
                            style={{ backgroundColor: '#3b82f6', padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              const extractLiveUrl = (r: any): string => {
                                if (r.homepage && r.homepage.trim()) {
                                  let url = r.homepage.trim();
                                  if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                    url = `https://${url}`;
                                  }
                                  return url;
                                }
                                if (r.description) {
                                  const match = r.description.match(/(https?:\/\/[^\s)]+)|(([a-zA-Z0-9-]+\.)+(vercel\.app|netlify\.app|github\.io|onrender\.com|indevs\.in)[^\s)]*)/i);
                                  if (match) {
                                    let url = match[0];
                                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                      url = `https://${url}`;
                                    }
                                    if (!url.includes('github.com')) return url;
                                  }
                                }
                                return '';
                              };
                              const bullets = [
                                `Architected and engineered full-stack application ${repo.name} built with ${repo.language || 'modern technologies'}.`,
                                repo.description ? repo.description : `Developed modular RESTful endpoints and interactive frontend components with clean UI/UX.`,
                                `Integrated automated version control using Git and established continuous deployment workflow.`
                              ];
                              const newProj = [...(profile.projects || []), {
                                name: repo.name,
                                description: repo.description || '',
                                technologies: [...(repo.languages || []), repo.language].filter(Boolean).slice(0, 6),
                                bullets,
                                githubUrl: repo.url || '',
                                liveUrl: extractLiveUrl(repo)
                              }];
                              setProfile({ ...profile, projects: newProj });
                              setShowRepoModal(false);
                            }}
                          >
                            + Import to Resume
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(profile.projects || []).map((proj, idx) => (
                  <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <input
                        style={{ fontWeight: 700, flex: 1 }}
                        placeholder="Project Name (e.g. AI Code Translator)"
                        value={proj.name}
                        onChange={(e) => {
                          const updated = [...profile.projects];
                          updated[idx].name = e.target.value;
                          setProfile({ ...profile, projects: updated });
                        }}
                      />
                      <input
                        style={{ flex: 1, fontSize: '0.85rem' }}
                        placeholder="Tech Stack (comma separated: React, Node.js)"
                        value={(proj.technologies || []).join(', ')}
                        onChange={(e) => {
                          const updated = [...profile.projects];
                          updated[idx].technologies = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          setProfile({ ...profile, projects: updated });
                        }}
                      />
                      <button onClick={() => {
                        const updated = profile.projects.filter((_, i) => i !== idx);
                        setProfile({ ...profile, projects: updated });
                      }} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input
                        style={{ flex: 1, fontSize: '0.85rem' }}
                        placeholder="GitHub Repo URL (https://github.com/...)"
                        value={proj.githubUrl || ''}
                        onChange={(e) => {
                          const updated = [...profile.projects];
                          updated[idx].githubUrl = e.target.value;
                          setProfile({ ...profile, projects: updated });
                        }}
                      />
                      <input
                        style={{ flex: 1, fontSize: '0.85rem' }}
                        placeholder="Live Deployed URL (https://...)"
                        value={proj.liveUrl || ''}
                        onChange={(e) => {
                          const updated = [...profile.projects];
                          updated[idx].liveUrl = e.target.value;
                          setProfile({ ...profile, projects: updated });
                        }}
                      />
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Bullet Points (one per line)</label>
                      <textarea
                        rows={3}
                        style={{ width: '100%', marginTop: '0.25rem' }}
                        value={(proj.bullets || []).join('\n')}
                        onChange={(e) => {
                          const updated = [...profile.projects];
                          updated[idx].bullets = e.target.value.split('\n').filter(Boolean);
                          setProfile({ ...profile, projects: updated });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'hackathons' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Hackathons & Achievements</h3>
                  <button
                    className="btn"
                    style={{ backgroundColor: 'var(--primary)', padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                    onClick={() => {
                      const newHack = [...(profile.hackathons || []), {
                        name: 'Odoo Hackathon 2025 Gandhinagar',
                        achievement: 'Secured Top 10 position in Internal Round'
                      }];
                      setProfile({ ...profile, hackathons: newHack });
                    }}
                  >
                    <Plus size={14} style={{ marginRight: '4px' }} /> Add Hackathon
                  </button>
                </div>
                {(profile.hackathons || []).map((hack, idx) => (
                  <div key={idx} style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      style={{ fontWeight: 600, flex: 1 }}
                      placeholder="Hackathon Name (e.g. Smart India Hackathon 2025)"
                      value={hack.name}
                      onChange={(e) => {
                        const updated = [...(profile.hackathons || [])];
                        updated[idx].name = e.target.value;
                        setProfile({ ...profile, hackathons: updated });
                      }}
                    />
                    <input
                      style={{ flex: 1 }}
                      placeholder="Achievement / Detail (e.g. Top 10 Finalist)"
                      value={hack.achievement || ''}
                      onChange={(e) => {
                        const updated = [...(profile.hackathons || [])];
                        updated[idx].achievement = e.target.value;
                        setProfile({ ...profile, hackathons: updated });
                      }}
                    />
                    <button onClick={() => {
                      const updated = (profile.hackathons || []).filter((_, i) => i !== idx);
                      setProfile({ ...profile, hackathons: updated });
                    }} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'certifications' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Certifications</h3>
                  <button
                    className="btn"
                    style={{ backgroundColor: 'var(--primary)', padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                    onClick={() => {
                      const newCerts = [...(profile.certifications || []), {
                        name: 'MongoDB Associate Developer',
                        issuer: 'MongoDB'
                      }];
                      setProfile({ ...profile, certifications: newCerts });
                    }}
                  >
                    <Plus size={14} style={{ marginRight: '4px' }} /> Add Certification
                  </button>
                </div>
                {(profile.certifications || []).map((cert, idx) => (
                  <div key={idx} style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        style={{ fontWeight: 600, flex: 1.5 }}
                        placeholder="Certification Name (e.g. MongoDB Associate Developer)"
                        value={cert.name}
                        onChange={(e) => {
                          const updated = [...(profile.certifications || [])];
                          updated[idx].name = e.target.value;
                          setProfile({ ...profile, certifications: updated });
                        }}
                      />
                      <input
                        style={{ flex: 1 }}
                        placeholder="Issuer / Platform (e.g. MongoDB)"
                        value={cert.issuer}
                        onChange={(e) => {
                          const updated = [...(profile.certifications || [])];
                          updated[idx].issuer = e.target.value;
                          setProfile({ ...profile, certifications: updated });
                        }}
                      />
                      <button onClick={() => {
                        const updated = (profile.certifications || []).filter((_, i) => i !== idx);
                        setProfile({ ...profile, certifications: updated });
                      }} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                    <div>
                      <input
                        style={{ width: '100%', fontSize: '0.85rem' }}
                        placeholder="Certificate Link / URL (e.g. Google Drive or Credential URL)"
                        value={cert.credentialUrl || ''}
                        onChange={(e) => {
                          const updated = [...(profile.certifications || [])];
                          updated[idx].credentialUrl = e.target.value;
                          setProfile({ ...profile, certifications: updated });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'skills' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Self-Add Custom Skill Categories</h3>
                  <button
                    className="btn"
                    style={{ backgroundColor: 'var(--primary)', padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                    onClick={() => {
                      const newCats = [...(profile.categorizedSkills || []), {
                        category: 'New Category',
                        skills: ['Skill 1', 'Skill 2']
                      }];
                      setProfile({ ...profile, categorizedSkills: newCats });
                    }}
                  >
                    <Plus size={14} style={{ marginRight: '4px' }} /> Add Skill Category
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '-0.5rem 0 0.5rem 0' }}>Add or edit your own categories (Programming Languages, Frontend, Backend & APIs, Databases, AI/ML, etc.)</p>
                {(profile.categorizedSkills || []).map((cat, idx) => (
                  <div key={idx} style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        style={{ fontWeight: 700, width: '40%' }}
                        placeholder="Category Name"
                        value={cat.category}
                        onChange={(e) => {
                          const updated = [...(profile.categorizedSkills || [])];
                          updated[idx].category = e.target.value;
                          setProfile({ ...profile, categorizedSkills: updated });
                        }}
                      />
                      <input
                        style={{ flex: 1 }}
                        placeholder="Comma separated skills (C++, Python, React...)"
                        value={(cat.skills || []).join(', ')}
                        onChange={(e) => {
                          const updated = [...(profile.categorizedSkills || [])];
                          updated[idx].skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          setProfile({ ...profile, categorizedSkills: updated });
                        }}
                      />
                      <button onClick={() => {
                        const updated = (profile.categorizedSkills || []).filter((_, i) => i !== idx);
                        setProfile({ ...profile, categorizedSkills: updated });
                      }} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'custom' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Self-Add Any Custom Section</h3>
                  <button
                    className="btn"
                    style={{ backgroundColor: 'var(--primary)', padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                    onClick={() => {
                      const newSecs = [...(profile.customSections || []), {
                        title: 'PUBLICATIONS / LEADERSHIP',
                        items: [{ title: 'Item Title', subtitle: 'Detail', date: '2025', bullets: ['Key accomplishment bullet point.'] }]
                      }];
                      setProfile({ ...profile, customSections: newSecs });
                    }}
                  >
                    <Plus size={14} style={{ marginRight: '4px' }} /> Add Custom Section
                  </button>
                </div>
                {(profile.customSections || []).map((sec, idx) => (
                  <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '0.75rem', background: 'rgba(15, 23, 42, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <input
                        style={{ fontWeight: 800, textTransform: 'uppercase', flex: 1, fontSize: '0.95rem' }}
                        placeholder="Section Title (e.g. VOLUNTEER WORK)"
                        value={sec.title}
                        onChange={(e) => {
                          const updated = [...(profile.customSections || [])];
                          updated[idx].title = e.target.value;
                          setProfile({ ...profile, customSections: updated });
                        }}
                      />
                      <button
                        className="btn"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: '#3b82f6' }}
                        onClick={() => {
                          const updated = [...(profile.customSections || [])];
                          updated[idx].items = [...(updated[idx].items || []), { title: 'New Item', date: '2025', bullets: ['Description'] }];
                          setProfile({ ...profile, customSections: updated });
                        }}
                      >+ Add Item</button>
                      <button onClick={() => {
                        const updated = (profile.customSections || []).filter((_, i) => i !== idx);
                        setProfile({ ...profile, customSections: updated });
                      }} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                    {(sec.items || []).map((item, iIdx) => (
                      <div key={iIdx} style={{ padding: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <input
                            style={{ fontWeight: 600, flex: 1 }}
                            placeholder="Title / Role"
                            value={item.title}
                            onChange={(e) => {
                              const updated = [...(profile.customSections || [])];
                              updated[idx].items[iIdx].title = e.target.value;
                              setProfile({ ...profile, customSections: updated });
                            }}
                          />
                          <input
                            style={{ width: '120px' }}
                            placeholder="Date"
                            value={item.date || ''}
                            onChange={(e) => {
                              const updated = [...(profile.customSections || [])];
                              updated[idx].items[iIdx].date = e.target.value;
                              setProfile({ ...profile, customSections: updated });
                            }}
                          />
                          <button onClick={() => {
                            const updated = [...(profile.customSections || [])];
                            updated[idx].items = updated[idx].items.filter((_, k) => k !== iIdx);
                            setProfile({ ...profile, customSections: updated });
                          }} style={{ color: 'var(--danger)', background: 'transparent', border: 'none' }}><Trash2 size={14} /></button>
                        </div>
                        <textarea
                          rows={2}
                          style={{ width: '100%' }}
                          placeholder="Bullet points (one per line)"
                          value={(item.bullets || []).join('\n')}
                          onChange={(e) => {
                            const updated = [...(profile.customSections || [])];
                            updated[idx].items[iIdx].bullets = e.target.value.split('\n').filter(Boolean);
                            setProfile({ ...profile, customSections: updated });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Live Classic 1-Page Preview Panel */}
        <div className="preview-panel">
          <div className="preview-toolbar">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>CLASSIC 1-PAGE DOCUMENT PREVIEW</span>
            <span style={{ fontSize: '0.8rem', color: '#10b981' }}>● Exact PDF Mirror</span>
          </div>

          <div className="resume-paper classic-paper">
            {/* Header */}
            <div className="paper-header-classic">
              <h2 className="classic-name">{(profile.personalInfo?.fullName || 'Developer Profile').toUpperCase()}</h2>
              <div className="classic-contact">
                Email: {profile.personalInfo?.email?.trim() || '******'} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Phone: {profile.personalInfo?.phone?.trim() || '******'}
              </div>
              <div className="classic-contact">
                LinkedIn: {profile.personalInfo?.linkedinUrl?.trim() || '******'} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; GitHub: {profile.personalInfo?.githubUrl?.trim() || '******'}
                {profile.personalInfo?.websiteUrl?.trim() ? ` &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Portfolio: ${profile.personalInfo.websiteUrl.trim()}` : ''}
                {(profile.personalInfo?.customLinks || []).filter(l => l.label && l.url).map(l => ` &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${l.label}: ${l.url}`).join('')}
              </div>
              <div className="classic-contact">
                Location: {profile.personalInfo?.location?.trim() || '******'}
              </div>
            </div>

            {/* Objective */}
            {profile.careerObjective?.trim() && (
              <div className="classic-section">
                <div className="classic-section-title">WORK EXPERIENCE / SUMMARY</div>
                <div className="classic-body" style={{ marginTop: '3px' }}>{profile.careerObjective}</div>
              </div>
            )}

            {/* Work Experience */}
            {profile.experience && profile.experience.length > 0 && (
              <div className="classic-section">
                <div className="classic-section-title">WORK EXPERIENCE</div>
                <div className="classic-body">
                  {profile.experience.map((exp, idx) => (
                    <div key={idx} className="classic-item">
                      <div className="classic-item-row">
                        <span className="classic-bold">{exp.role}{exp.company ? ` | ${exp.company}` : ''}</span>
                        <span>{exp.startDate} {exp.startDate || exp.endDate ? '–' : ''} {exp.current ? 'Present' : exp.endDate}</span>
                      </div>
                      <div className="classic-bullets">
                        {exp.bullets?.map((b, i) => (
                          <div key={i}>●   {b}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {profile.education && profile.education.length > 0 && (
              <div className="classic-section">
                <div className="classic-section-title">EDUCATION</div>
                <div className="classic-body">
                  {profile.education.map((edu, idx) => (
                    <div key={idx} className="classic-item">
                      <div className="classic-item-row">
                        <span className="classic-bold">{edu.institution}</span>
                        <span>{edu.highlights && edu.highlights[0] ? edu.highlights[0] : ''}</span>
                      </div>
                      <div className="classic-item-row">
                        <span>{edu.fieldOfStudy ? `${edu.degree} in ${edu.fieldOfStudy}` : edu.degree}</span>
                        <span>{edu.startYear} {edu.startYear || edu.endYear ? '–' : ''} {edu.endYear}</span>
                      </div>
                      {edu.gpa && <div style={{ fontSize: '0.84rem' }}>●   Cumulative GPA: {edu.gpa}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {profile.projects && profile.projects.length > 0 && (
              <div className="classic-section">
                <div className="classic-section-title">PROJECTS</div>
                <div className="classic-body">
                  {profile.projects.map((proj, idx) => (
                    <div key={idx} className="classic-item">
                      <div className="classic-item-row">
                        <span className="classic-bold">
                          {proj.name}{proj.technologies && proj.technologies.length > 0 ? ` (${proj.technologies.join(', ')})` : ''}
                        </span>
                        <span>
                          {proj.githubUrl?.trim() && (
                            <a href={proj.githubUrl.trim()} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8', textDecoration: 'underline' }}>GitHub</a>
                          )}
                          {proj.githubUrl?.trim() && proj.liveUrl?.trim() && ' | '}
                          {proj.liveUrl?.trim() && (
                            <a href={proj.liveUrl.trim()} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8', textDecoration: 'underline' }}>Live</a>
                          )}
                        </span>
                      </div>
                      {proj.description && (!proj.bullets || proj.bullets.length === 0) && (
                        <div className="classic-bullets"><div>●   {proj.description}</div></div>
                      )}
                      <div className="classic-bullets">
                        {proj.bullets?.map((b, i) => (
                          <div key={i}>●   {b}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hackathons */}
            {profile.hackathons && profile.hackathons.length > 0 && (
              <div className="classic-section">
                <div className="classic-section-title">HACKATHONS</div>
                <div className="classic-body">
                  {profile.hackathons.map((hack, idx) => (
                    <div key={idx} style={{ fontSize: '0.86rem', marginBottom: '3px' }}>
                      ●   {hack.name}{hack.achievement ? ` | ${hack.achievement}` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {profile.certifications && profile.certifications.length > 0 && (
              <div className="classic-section">
                <div className="classic-section-title">CERTIFICATIONS</div>
                <div className="classic-body">
                  {profile.certifications.map((cert, idx) => (
                    <div key={idx} className="classic-item-row" style={{ marginBottom: '3px' }}>
                      <span>●   {cert.name} | {cert.issuer}</span>
                      {cert.credentialUrl ? (
                        <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8', textDecoration: 'underline' }}>Certificate</a>
                      ) : (
                        <span>Certificate</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            <div className="classic-section">
              <div className="classic-section-title">SKILLS</div>
              <div className="classic-body">
                {profile.categorizedSkills && profile.categorizedSkills.length > 0 ? (
                  profile.categorizedSkills.map((cat, idx) => (
                    cat.skills && cat.skills.length > 0 ? (
                      <div key={idx} style={{ display: 'flex', marginBottom: '3px', fontSize: '0.86rem' }}>
                        <span className="classic-bold" style={{ width: '190px', flexShrink: 0 }}>{cat.category}:</span>
                        <span>{cat.skills.join(', ')}</span>
                      </div>
                    ) : null
                  ))
                ) : (
                  <>
                    {profile.skills?.technical?.length > 0 && <div style={{ display: 'flex', marginBottom: '3px', fontSize: '0.86rem' }}><span className="classic-bold" style={{ width: '190px', flexShrink: 0 }}>Programming Languages:</span><span>{profile.skills.technical.join(', ')}</span></div>}
                    {profile.skills?.frameworks?.length > 0 && <div style={{ display: 'flex', marginBottom: '3px', fontSize: '0.86rem' }}><span className="classic-bold" style={{ width: '190px', flexShrink: 0 }}>Frameworks & Libs:</span><span>{profile.skills.frameworks.join(', ')}</span></div>}
                    {profile.skills?.tools?.length > 0 && <div style={{ display: 'flex', marginBottom: '3px', fontSize: '0.86rem' }}><span className="classic-bold" style={{ width: '190px', flexShrink: 0 }}>Tools & Platforms:</span><span>{profile.skills.tools.join(', ')}</span></div>}
                  </>
                )}
              </div>
            </div>

            {/* Custom Sections */}
            {profile.customSections && profile.customSections.map((sec, idx) => (
              sec.title && sec.items?.length > 0 ? (
                <div key={idx} className="classic-section">
                  <div className="classic-section-title">{sec.title.toUpperCase()}</div>
                  <div className="classic-body">
                    {sec.items.map((item, iIdx) => (
                      <div key={iIdx} className="classic-item">
                        <div className="classic-item-row">
                          <span className="classic-bold">{item.title}</span>
                          <span>{item.date}</span>
                        </div>
                        {item.subtitle && <div style={{ fontStyle: 'italic', fontSize: '0.84rem' }}>{item.subtitle}</div>}
                        <div className="classic-bullets">
                          {item.bullets?.map((b, i) => (
                            <div key={i}>•   {b}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeStudio;
