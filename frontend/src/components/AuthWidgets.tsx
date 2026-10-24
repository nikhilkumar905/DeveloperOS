import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';
import { authHttp } from '../context/AuthContext';

export interface AuthConfig {
  google: boolean;
  emailDelivery: 'smtp' | 'console' | 'disabled';
}

/** Which sign-in options the server has configured. */
export const useAuthConfig = (): AuthConfig | null => {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  useEffect(() => {
    authHttp.get<AuthConfig>('/api/auth/config').then(r => setConfig(r.data)).catch(() => setConfig({ google: false, emailDelivery: 'disabled' }));
  }, []);
  return config;
};

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export const GoogleButton: React.FC<{ enabled: boolean; label?: string }> = ({ enabled, label = 'Continue with Google' }) => (
  <div>
    <a
      className={`btn btn-secondary auth-google${enabled ? '' : ' disabled'}`}
      href={enabled ? `${API_BASE_URL}/api/auth/google/login` : undefined}
      aria-disabled={!enabled}
      onClick={(e) => { if (!enabled) e.preventDefault(); }}
    >
      <GoogleLogo /> {label}
    </a>
    {!enabled && <p className="auth-hint">Google sign-in isn't set up on this server yet.</p>}
  </div>
);

export const Divider: React.FC<{ text?: string }> = ({ text = 'or' }) => (
  <div className="auth-divider"><span>{text}</span></div>
);

export const OtpInput: React.FC<{ value: string; onChange: (v: string) => void; autoFocus?: boolean }> = ({ value, onChange, autoFocus }) => (
  <input
    className="input-field auth-otp"
    value={value}
    onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
    inputMode="numeric"
    autoComplete="one-time-code"
    pattern="\d{6}"
    maxLength={6}
    placeholder="••••••"
    aria-label="6-digit verification code"
    autoFocus={autoFocus}
    required
  />
);

const COMMON = new Set(['password', 'password1', 'password123', '12345678', '123456789', 'qwerty123', 'iloveyou', 'admin123', 'passw0rd', 'welcome1', 'letmein1']);

/** Mirrors the server's rules so users see problems before submitting. */
export const passwordChecks = (password: string, email = '') => [
  { ok: password.length >= 8, label: 'At least 8 characters' },
  { ok: /[A-Za-z]/.test(password) && /\d/.test(password), label: 'Contains a letter and a number' },
  { ok: password.length > 0 && !COMMON.has(password.toLowerCase()) && password.toLowerCase() !== email.toLowerCase(), label: 'Not a common password or your email' },
];

export const PasswordChecklist: React.FC<{ password: string; email?: string }> = ({ password, email }) => (
  <ul className="auth-checklist">
    {passwordChecks(password, email).map(c => (
      <li key={c.label} className={c.ok ? 'ok' : ''}>
        {c.ok ? <Check size={13} /> : <X size={13} />} {c.label}
      </li>
    ))}
  </ul>
);

/** Seconds remaining until resend is allowed. */
export const useCountdown = (initial = 0) => {
  const [seconds, setSeconds] = useState(initial);
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);
  return [seconds, setSeconds] as const;
};
