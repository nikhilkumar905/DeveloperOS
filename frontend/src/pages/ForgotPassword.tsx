import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authHttp } from '../context/AuthContext';
import { KeyRound } from 'lucide-react';
import AuthTopBar from '../components/AuthTopBar';
import { OtpInput, PasswordChecklist, passwordChecks, useAuthConfig, useCountdown } from '../components/AuthWidgets';
import { getErrorMessage } from '../lib/api';
import './Auth.css';

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useCountdown(0);
  const config = useAuthConfig();
  const navigate = useNavigate();

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await authHttp.post('/api/auth/password/forgot', { email });
      setResendIn(res.data.resendAfter || 60);
      setNotice(res.data.message);
      setStep('reset');
    } catch (err: any) {
      setError(getErrorMessage(err, "Couldn't send the reset code"));
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!passwordChecks(password, email).every(c => c.ok)) return setError('Please choose a stronger password.');
    if (password !== confirm) return setError('Passwords do not match.');
    setSubmitting(true);
    try {
      const res = await authHttp.post('/api/auth/password/reset', { email, code, password });
      navigate('/login', { replace: true, state: { message: res.data.message } });
    } catch (err: any) {
      setError(getErrorMessage(err, "Couldn't reset the password"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthTopBar />
      <div className="card auth-card animate-fade-in">
        <div className="auth-heading">
          <KeyRound style={{ color: 'var(--primary)', width: '44px', height: '44px' }} />
          <h2>{step === 'email' ? 'Reset your password' : 'Choose a new password'}</h2>
          <p>{step === 'email' ? "Enter your account's email and we'll send you a reset code." : `Enter the code sent to ${email} and your new password.`}</p>
        </div>

        {step === 'reset' && config?.emailDelivery === 'console' && (
          <div className="auth-notice">Development mode: the code is printed in the backend console.</div>
        )}
        {notice && step === 'reset' && <div className="auth-success" role="status">{notice}</div>}
        {error && <div className="auth-error" role="alert">{error}</div>}

        {step === 'email' ? (
          <form onSubmit={requestCode}>
            <div className="form-group">
              <label className="form-label" htmlFor="fp-email">Email</label>
              <input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="input-field" placeholder="you@example.com" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset code'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <div className="form-group">
              <label className="form-label" htmlFor="fp-code">Reset code</label>
              <OtpInput value={code} onChange={setCode} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="fp-password">New password</label>
              <input id="fp-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" className="input-field" placeholder="New password" />
              {password && <PasswordChecklist password={password} email={email} />}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="fp-confirm">Confirm new password</label>
              <input id="fp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" className="input-field" placeholder="Repeat new password" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting || code.length !== 6}>
              {submitting ? 'Saving…' : 'Reset password'}
            </button>
            <div className="auth-row" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <button type="button" className="auth-link-button" onClick={() => { setStep('email'); setCode(''); setError(''); }}>Use a different email</button>
              <button type="button" className="auth-link-button" onClick={() => requestCode()} disabled={resendIn > 0}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          Remembered it? <Link to="/login" className="auth-link">Back to log in</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
