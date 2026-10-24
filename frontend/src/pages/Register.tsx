import React, { useState, useContext } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { AuthContext, authHttp } from '../context/AuthContext';
import type { Session } from '../context/AuthContext';
import { Terminal, MailCheck } from 'lucide-react';
import AuthTopBar from '../components/AuthTopBar';
import { GoogleButton, Divider, OtpInput, PasswordChecklist, passwordChecks, useAuthConfig, useCountdown } from '../components/AuthWidgets';
import { getErrorMessage } from '../lib/api';
import './Auth.css';

const Register: React.FC = () => {
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useCountdown(0);
  const { login, user, isLoading } = useContext(AuthContext);
  const config = useAuthConfig();
  const navigate = useNavigate();

  if (!isLoading && user) return <Navigate to="/dashboard" replace />;

  const passwordOk = passwordChecks(password, email).every(c => c.ok);

  const handleDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!passwordOk) return setError('Please choose a stronger password.');
    if (password !== confirm) return setError('Passwords do not match.');
    setSubmitting(true);
    try {
      const res = await authHttp.post('/api/auth/register', { name, email, password });
      setEmail(res.data.email || email.trim().toLowerCase());
      setResendIn(res.data.resendAfter || 60);
      setNotice('');
      setStep('verify');
    } catch (err: any) {
      setError(getErrorMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await authHttp.post<Session>('/api/auth/register/verify', { email, code });
      login(res.data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(getErrorMessage(err, 'Verification failed'));
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      const res = await authHttp.post('/api/auth/register/resend', { email });
      setResendIn(res.data.resendAfter || 60);
      setNotice('A new code is on its way. Codes expire after 10 minutes.');
    } catch (err: any) {
      setError(getErrorMessage(err, "Couldn't resend the code"));
    }
  };

  return (
    <div className="auth-page">
      <AuthTopBar />
      <div className="card auth-card animate-fade-in">
        {step === 'details' ? (
          <>
            <div className="auth-heading">
              <Link to="/" aria-label="Back to home" style={{ display: 'inline-block' }}>
                <Terminal style={{ color: 'var(--primary)', width: '44px', height: '44px' }} />
              </Link>
              <h2>Create your account</h2>
              <p>Join PersonalOS to track your developer journey</p>
            </div>

            {error && <div className="auth-error" role="alert">{error}</div>}

            <GoogleButton enabled={!!config?.google} label="Sign up with Google" />
            <Divider text="or sign up with email" />

            <form onSubmit={handleDetails}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-name">Full name</label>
                <input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" className="input-field" placeholder="Your name" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email</label>
                <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="input-field" placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-password">Password</label>
                <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" className="input-field" placeholder="Create a password" />
                {password && <PasswordChecklist password={password} email={email} />}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
                <input id="reg-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" className="input-field" placeholder="Repeat your password" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                {submitting ? 'Sending code…' : 'Continue'}
              </button>
            </form>

            <div className="auth-footer">
              Already have an account? <Link to="/login" className="auth-link">Log in</Link>
            </div>
          </>
        ) : (
          <>
            <div className="auth-heading">
              <MailCheck style={{ color: 'var(--primary)', width: '44px', height: '44px' }} />
              <h2>Check your email</h2>
              <p>Enter the 6-digit code we sent to <strong style={{ color: 'var(--text-main)' }}>{email}</strong></p>
            </div>

            {config?.emailDelivery === 'console' && (
              <div className="auth-notice">Development mode: no email server is configured, so the code is printed in the backend console.</div>
            )}
            {notice && <div className="auth-success" role="status">{notice}</div>}
            {error && <div className="auth-error" role="alert">{error}</div>}

            <form onSubmit={handleVerify}>
              <div className="form-group">
                <OtpInput value={code} onChange={setCode} autoFocus />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting || code.length !== 6}>
                {submitting ? 'Verifying…' : 'Verify and create account'}
              </button>
            </form>

            <div className="auth-row" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <button type="button" className="auth-link-button" onClick={() => { setStep('details'); setCode(''); setError(''); }}>
                Use a different email
              </button>
              <button type="button" className="auth-link-button" onClick={handleResend} disabled={resendIn > 0}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
