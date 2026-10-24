import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Terminal } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

/** Top bar for the login/register pages: brand and a way back to the landing page. */
const AuthTopBar: React.FC = () => (
  <header style={{
    position: 'absolute', top: 0, left: 0, right: 0, height: '64px', padding: '0 2rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }}>
    <Link to="/" aria-label="DeveloperOS home" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: 'var(--on-primary)' }}>
        <Terminal size={17} />
      </span>
      PersonalOS
    </Link>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        <ArrowLeft size={16} /> Back to home
      </Link>
      <ThemeToggle />
    </div>
  </header>
);

export default AuthTopBar;
