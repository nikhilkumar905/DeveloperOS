import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Terminal } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, { name, email, password });
      login(res.data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Terminal style={{ color: 'var(--primary)', width: '48px', height: '48px', margin: '0 auto' }} />
          <h2 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>Create Account</h2>
          <p style={{ color: 'var(--text-muted)' }}>Start building your developer OS</p>
        </div>
        
        {error && <div style={{ color: 'white', backgroundColor: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input-field" placeholder="John Doe" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" placeholder="Enter your email" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-field" placeholder="Create a password" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Register</button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)' }}>Login here</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
