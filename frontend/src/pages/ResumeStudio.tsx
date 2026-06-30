import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FileText, Sparkles, Download, AlertCircle, Plus, Trash2, Award } from 'lucide-react';
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
  }>;
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string;
    gpa?: string;
  }>;
  atsScore: number;
  atsSuggestions: string[];
}

const ResumeStudio: React.FC = () => {
  const [profile, setProfile] = useState<IResumeProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inferring, setInferring] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'skills' | 'experience' | 'projects' | 'education'>('personal');
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
    fetchProfile();
  }, [contextToken]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:6500/api/resume/profile', getAuthHeaders());
      setProfile(res.data);
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
      const res = await axios.post('http://localhost:6500/api/resume/infer', { targetRole: profile.targetRole || 'Software Engineer' }, getAuthHeaders());
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
      const res = await axios.put('http://localhost:6500/api/resume/profile', profile, getAuthHeaders());
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
      const res = await axios.get('http://localhost:6500/api/resume/export/pdf', {
        ...getAuthHeaders(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${(profile?.personalInfo?.fullName || 'Developer').replace(/\s+/g, '_')}_Resume.pdf`);
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
          <p>ATS-Optimized resume generator backed by your Developer Knowledge Graph & repository intelligence.</p>
        </div>
        <div className="resume-actions">
          {saveStatus && <span style={{ color: '#10b981', alignSelf: 'center', fontWeight: 600 }}>{saveStatus}</span>}
          <button className="btn-infer" onClick={handleInfer} disabled={inferring}>
            <Sparkles size={18} />
            {inferring ? 'Inferring...' : 'Auto-Infer from GitHub'}
          </button>
          <button className="btn" style={{ backgroundColor: 'var(--bg-surface-hover)' }} onClick={handleSave}>
            Save Changes
          </button>
          <button className="btn-export" onClick={handleExportPdf} disabled={exporting}>
            <Download size={18} />
            {exporting ? 'Exporting...' : 'Export ATS PDF'}
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
            {profile.atsSuggestions && profile.atsSuggestions.length > 0 && (
              <div className="ats-suggestions">
                {profile.atsSuggestions.slice(0, 3).map((sug, idx) => (
                  <div key={idx} className="suggestion-item">
                    <AlertCircle size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    {sug}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Tabs */}
          <div className="form-tabs">
            <button className={`form-tab-btn ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>Personal Info</button>
            <button className={`form-tab-btn ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>Skills</button>
            <button className={`form-tab-btn ${activeTab === 'experience' ? 'active' : ''}`} onClick={() => setActiveTab('experience')}>Experience</button>
            <button className={`form-tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>Projects</button>
            <button className={`form-tab-btn ${activeTab === 'education' ? 'active' : ''}`} onClick={() => setActiveTab('education')}>Education</button>
          </div>

          {/* Editor Form */}
          <div className="editor-form">
            {activeTab === 'personal' && (
              <>
                <div className="form-group">
                  <label>Target Job Role & Template</label>
                  <select
                    value={profile.targetRole}
                    onChange={(e) => setProfile({ ...profile, targetRole: e.target.value, selectedTemplate: e.target.value })}
                  >
                    <option value="Software Engineer">Software Engineer</option>
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="AI/ML Engineer">AI/ML Engineer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                  </select>
                </div>
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
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={profile.personalInfo?.location || ''}
                    onChange={(e) => setProfile({ ...profile, personalInfo: { ...profile.personalInfo, location: e.target.value } })}
                  />
                </div>
                <div className="form-group">
                  <label>Professional Summary / Objective</label>
                  <textarea
                    rows={4}
                    value={profile.careerObjective || ''}
                    onChange={(e) => setProfile({ ...profile, careerObjective: e.target.value })}
                  />
                </div>
              </>
            )}

            {activeTab === 'skills' && (
              <>
                <div className="form-group">
                  <label>Programming Languages (comma separated)</label>
                  <input
                    type="text"
                    value={(profile.skills?.technical || []).join(', ')}
                    onChange={(e) => setProfile({ ...profile, skills: { ...profile.skills, technical: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                  />
                </div>
                <div className="form-group">
                  <label>Frameworks & Libraries (comma separated)</label>
                  <input
                    type="text"
                    value={(profile.skills?.frameworks || []).join(', ')}
                    onChange={(e) => setProfile({ ...profile, skills: { ...profile.skills, frameworks: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                  />
                </div>
                <div className="form-group">
                  <label>Tools & Cloud Platforms (comma separated)</label>
                  <input
                    type="text"
                    value={(profile.skills?.tools || []).join(', ')}
                    onChange={(e) => setProfile({ ...profile, skills: { ...profile.skills, tools: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                  />
                </div>
              </>
            )}

            {activeTab === 'experience' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Professional Experience</h3>
                  <button
                    className="btn"
                    style={{ backgroundColor: 'var(--primary)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    onClick={() => {
                      const newExp = [...(profile.experience || []), {
                        role: 'Software Engineer',
                        company: 'Tech Company',
                        location: 'Remote',
                        startDate: '2023',
                        endDate: 'Present',
                        current: true,
                        bullets: ['Engineered scalable microservices API contributing to 30% reduction in latency.']
                      }];
                      setProfile({ ...profile, experience: newExp });
                    }}
                  >
                    <Plus size={14} style={{ marginRight: '4px' }} /> Add Experience
                  </button>
                </div>
                {(profile.experience || []).map((exp, idx) => (
                  <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <input
                        style={{ fontWeight: 700, width: '45%' }}
                        value={exp.role}
                        onChange={(e) => {
                          const updated = [...profile.experience];
                          updated[idx].role = e.target.value;
                          setProfile({ ...profile, experience: updated });
                        }}
                      />
                      <input
                        style={{ width: '45%' }}
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
                      }} style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
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

            {activeTab === 'projects' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Technical Projects</h3>
                </div>
                {(profile.projects || []).map((proj, idx) => (
                  <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <input
                        style={{ fontWeight: 700, width: '50%' }}
                        value={proj.name}
                        onChange={(e) => {
                          const updated = [...profile.projects];
                          updated[idx].name = e.target.value;
                          setProfile({ ...profile, projects: updated });
                        }}
                      />
                      <button onClick={() => {
                        const updated = profile.projects.filter((_, i) => i !== idx);
                        setProfile({ ...profile, projects: updated });
                      }} style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Technologies (comma separated)</label>
                      <input
                        style={{ width: '100%', marginTop: '0.25rem' }}
                        value={(proj.technologies || []).join(', ')}
                        onChange={(e) => {
                          const updated = [...profile.projects];
                          updated[idx].technologies = e.target.value.split(',').map(s => s.trim());
                          setProfile({ ...profile, projects: updated });
                        }}
                      />
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Bullets</label>
                      <textarea
                        rows={2}
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

            {activeTab === 'education' && (
              <>
                {(profile.education || []).map((edu, idx) => (
                  <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <input
                      style={{ fontWeight: 700, width: '100%', marginBottom: '0.5rem' }}
                      value={edu.degree}
                      onChange={(e) => {
                        const updated = [...profile.education];
                        updated[idx].degree = e.target.value;
                        setProfile({ ...profile, education: updated });
                      }}
                    />
                    <input
                      style={{ width: '100%' }}
                      value={edu.institution}
                      onChange={(e) => {
                        const updated = [...profile.education];
                        updated[idx].institution = e.target.value;
                        setProfile({ ...profile, education: updated });
                      }}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Live A4 Preview Panel */}
        <div className="preview-panel">
          <div className="preview-toolbar">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>LIVE A4 DOCUMENT PREVIEW</span>
            <span style={{ fontSize: '0.8rem', color: '#10b981' }}>● Real-time sync</span>
          </div>

          <div className="resume-paper">
            <div className="paper-header">
              <h2>{profile.personalInfo?.fullName || 'Developer Profile'}</h2>
              <h3>{profile.personalInfo?.jobTitle || 'Software Engineer'}</h3>
              <div className="paper-contact">
                {[profile.personalInfo?.email, profile.personalInfo?.phone, profile.personalInfo?.location].filter(Boolean).join('   |   ')}
              </div>
            </div>

            {profile.careerObjective && (
              <div className="paper-section">
                <div className="paper-section-title">Professional Summary</div>
                <div className="paper-body">{profile.careerObjective}</div>
              </div>
            )}

            <div className="paper-section">
              <div className="paper-section-title">Technical Skills</div>
              <div className="paper-body">
                {profile.skills?.technical?.length > 0 && <div><strong>Languages:</strong> {profile.skills.technical.join(', ')}</div>}
                {profile.skills?.frameworks?.length > 0 && <div><strong>Frameworks:</strong> {profile.skills.frameworks.join(', ')}</div>}
                {profile.skills?.tools?.length > 0 && <div><strong>Tools & Platforms:</strong> {profile.skills.tools.join(', ')}</div>}
              </div>
            </div>

            {profile.experience && profile.experience.length > 0 && (
              <div className="paper-section">
                <div className="paper-section-title">Professional Experience</div>
                <div className="paper-body">
                  {profile.experience.map((exp, idx) => (
                    <div key={idx} className="paper-item">
                      <div className="paper-item-header">
                        <span>{exp.role}</span>
                        <span>{exp.company}</span>
                      </div>
                      <div className="paper-item-sub">{exp.startDate} - {exp.current ? 'Present' : exp.endDate} | {exp.location || 'Remote'}</div>
                      <div className="paper-bullets">
                        {exp.bullets?.map((b, i) => (
                          <div key={i}>• {b}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.projects && profile.projects.length > 0 && (
              <div className="paper-section">
                <div className="paper-section-title">Technical Projects</div>
                <div className="paper-body">
                  {profile.projects.map((proj, idx) => (
                    <div key={idx} className="paper-item">
                      <div className="paper-item-header">
                        <span>{proj.name}</span>
                        <span style={{ fontSize: '0.8rem', color: '#3b82f6' }}>[{proj.technologies?.join(', ')}]</span>
                      </div>
                      <div style={{ fontSize: '0.84rem', marginBottom: '2px' }}>{proj.description}</div>
                      <div className="paper-bullets">
                        {proj.bullets?.map((b, i) => (
                          <div key={i}>• {b}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.education && profile.education.length > 0 && (
              <div className="paper-section">
                <div className="paper-section-title">Education</div>
                <div className="paper-body">
                  {profile.education.map((edu, idx) => (
                    <div key={idx} className="paper-item">
                      <div className="paper-item-header">
                        <span>{edu.degree} in {edu.fieldOfStudy}</span>
                        <span>{edu.institution}</span>
                      </div>
                      <div className="paper-item-sub">{edu.startYear} - {edu.endYear} {edu.gpa ? `| GPA: ${edu.gpa}` : ''}</div>
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

export default ResumeStudio;
