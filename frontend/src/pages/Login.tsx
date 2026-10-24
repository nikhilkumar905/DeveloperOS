import React, { useState, useContext } from 'react';
import { useNavigate, Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthContext, authHttp } from '../context/AuthContext';
import type { Session } from '../context/AuthContext';
import { Terminal } from 'lucide-react';
import AuthTopBar from '../components/AuthTopBar';
import { GoogleButton, Divider, useAuthConfig } from '../components/AuthWidgets';
import { getErrorMessage } from '../lib/api';
import './Auth.css';

const ERROR_MESSAGES: Record<string, string> = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_failed: "We couldn't sign you in with Google. Please try again.",
  google_state: 'Your Google sign-in session expired. Please try again.',
  google_conflict: 'This email is already linked to a different Google account.',
  google_not_configured: "Google sign-in isn't set up on this server yet.",
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [params] = useSearchParams();
  const location = useLocation();
  const [error, setError] = useState(ERROR_MESSAGES[params.get('error') || ''] || '');
  const success = (location.state as { message?: string } | null)?.message;
  const { login, user, isLoading } = useContext(AuthContext);
  const config = useAuthConfig();
  const navigate = useNavigate();

  if (!isLoading && user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await authHttp.post<Session>('/api/auth/login', { email, password });
      login(res.data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(getErrorMessage(err, 'Invalid email or password'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthTopBar />
      <div className="card auth-card animate-fade-in">
        <div className="auth-heading">
          <Link to="/" aria-label="Back to home" style={{ display: 'inline-block' }}>
            <Terminal style={{ color: 'var(--primary)', width: '44px', height: '44px' }} />
          </Link>
          <h2>Welcome back</h2>
          <p>Log in to access your workspace</p>
        </div>

        {success && <div className="auth-success" role="status">{success}</div>}
        {error && <div className="auth-error" role="alert">{error}</div>}

        <GoogleButton enabled={!!config?.google} />
        <Divider text="or log in with email" />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="input-field" placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="input-field" placeholder="Enter your password" />
          </div>
          <div className="auth-row">
            <span />
            <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register" className="auth-link">Create one</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
