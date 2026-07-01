import React, { useContext } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Terminal, LayoutDashboard, UserCircle, LogOut, FileText, Globe, Zap } from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { user, logout, isLoading } = useContext(AuthContext);
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--text-main)', flexDirection: 'column', gap: '1rem' }}>
        <Terminal style={{ color: 'var(--primary)', width: '48px', height: '48px' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>Loading DeveloperOS workspace...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  const getPageTitle = (pathname: string): string => {
    if (pathname === '/dashboard') return 'Overview';
    if (pathname.includes('/resume')) return 'Resume Studio';
    if (pathname.includes('/portfolio')) return 'Portfolio Studio';
    if (pathname.includes('/activity')) return 'Activity Tracker';
    return 'Dashboard';
  };

  const navLinkStyle = (path: string, exact = false) => {
    const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1rem',
      borderRadius: 'var(--radius-md)',
      color: isActive ? 'white' : 'var(--text-main)',
      backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
      borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
      fontWeight: isActive ? 600 : 500,
      transition: 'all 0.2s ease',
    };
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)' }}>
          <Terminal style={{ color: 'var(--primary)' }} />
          <span>PersonalOS</span>
        </div>
        
        <nav style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link to="/dashboard" style={navLinkStyle('/dashboard', true)}>
            <LayoutDashboard size={20} />
            Overview
          </Link>
          <Link to="/dashboard/resume" style={navLinkStyle('/dashboard/resume')}>
            <FileText size={20} style={{ color: '#10b981' }} />
            Resume Studio
          </Link>
          <Link to="/dashboard/portfolio" style={navLinkStyle('/dashboard/portfolio')}>
            <Globe size={20} style={{ color: '#a855f7' }} />
            Portfolio Studio
          </Link>
          <Link to="/dashboard/activity" style={navLinkStyle('/dashboard/activity')}>
            <Zap size={20} style={{ color: '#f59e0b' }} />
            Activity Tracker
          </Link>
        </nav>
        
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', color: 'var(--text-muted)' }}>
            <UserCircle size={24} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
          </div>
          <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)' }}>
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: '64px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', display: 'flex', alignItems: 'center', padding: '0 2rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{getPageTitle(location.pathname)}</h1>
        </header>
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
