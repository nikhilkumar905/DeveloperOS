import React, { useContext } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Terminal, LayoutDashboard, UserCircle, LogOut, FileText, Globe, Zap } from 'lucide-react';
import { useAutoSync } from '../hooks/useAutoSync';
import { ChatWidget } from '../components/ChatWidget';

const DashboardLayout: React.FC = () => {
  const { user, token, logout, isLoading } = useContext(AuthContext);
  const location = useLocation();

  // Enable background auto-syncing every 3 minutes across all dashboard routes
  useAutoSync(token, 3 * 60 * 1000);

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
      gap: '0.5rem',
      padding: '0.5rem 0.75rem',
      color: isActive ? 'white' : 'var(--text-main)',
      backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
      borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
      borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
      fontWeight: isActive ? 600 : 500,
      transition: 'all 0.2s ease',
      fontSize: '0.95rem'
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      {/* Top Navbar */}
      <header className="glass-panel" style={{ 
        height: '64px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        {/* Left: Logo + Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
            <Terminal style={{ color: 'var(--primary)' }} />
            <span className="text-gradient">PersonalOS</span>
          </div>
          
          <nav style={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap: '0.5rem', paddingTop: '16px' }}>
            <Link to="/dashboard" style={navLinkStyle('/dashboard', true)}>
              <LayoutDashboard size={18} />
              Overview
            </Link>
            <Link to="/dashboard/resume" style={navLinkStyle('/dashboard/resume')}>
              <FileText size={18} style={{ color: '#10b981' }} />
              Resume Studio
            </Link>
            <Link to="/dashboard/portfolio" style={navLinkStyle('/dashboard/portfolio')}>
              <Globe size={18} style={{ color: '#a855f7' }} />
              Portfolio Studio
            </Link>
            <Link to="/dashboard/activity" style={navLinkStyle('/dashboard/activity')}>
              <Zap size={18} style={{ color: '#f59e0b' }} />
              Activity Tracker
            </Link>
          </nav>
        </div>
        
        {/* Right: User + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <UserCircle size={20} />
            <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>
              {user.name}
            </span>
          </div>
          <button 
            onClick={logout} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              color: 'var(--danger)', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content (Full Width) */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Page Title */}
        <div style={{ padding: '2rem 2rem 0', width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
           <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
             {getPageTitle(location.pathname)}
           </h1>
        </div>
        
        {/* Page Content Container */}
        <div style={{ flex: 1, padding: '1.5rem 2rem 2rem', width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
      <ChatWidget />
    </div>
  );
};

export default DashboardLayout;

