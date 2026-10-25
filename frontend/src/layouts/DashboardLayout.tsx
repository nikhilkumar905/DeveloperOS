import React, { useContext, useRef, useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthContext, authHttp } from '../context/AuthContext';
import { Terminal, LayoutDashboard, UserCircle, LogOut, FileText, Globe, Zap, ChevronDown } from 'lucide-react';
import { useAutoSync } from '../hooks/useAutoSync';
import { ChatWidget } from '../components/ChatWidget';
import ThemeToggle from '../components/ThemeToggle';

const DashboardLayout: React.FC = () => {
  const { user, token, logout, isLoading, getValidToken } = useContext(AuthContext);
  // A deliberate logout goes to the landing page; an expired/missing session still goes to /login
  const loggingOut = useRef(false);
  const handleLogout = () => {
    loggingOut.current = true;
    logout();
  };

  const [menuOpen, setMenuOpen] = useState(false);
  // Revokes every session and the browser extension's token, then logs out here
  const handleLogoutEverywhere = async () => {
    if (!window.confirm('Log out on every device and disconnect the browser extension?')) return;
    try {
      const fresh = await getValidToken();
      await authHttp.post('/api/auth/logout-all', {}, { headers: { Authorization: `Bearer ${fresh}` } });
    } catch (err) {
      console.error('Could not log out everywhere', err);
    }
    loggingOut.current = true;
    logout();
  };
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

  if (!user) return <Navigate to={loggingOut.current ? '/' : '/login'} replace />;

  const getPageTitle = (pathname: string): string => {
    if (pathname === '/dashboard') return 'Overview';
    if (pathname.includes('/resume')) return 'Resume Studio';
    if (pathname.includes('/portfolio')) return 'Portfolio Studio';
    if (pathname.includes('/activity')) return 'Activity Tracker';
    return 'Dashboard';
  };

  const navLinkStyle = (path: string, exact = false): React.CSSProperties => {
    const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      height: '100%',
      padding: '0 0.85rem',
      color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
      borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
      fontWeight: isActive ? 600 : 500,
      transition: 'color 0.15s ease, border-color 0.15s ease',
      fontSize: '0.9rem'
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      {/* Top Navbar */}
      <header className="glass-panel" style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Left: Logo + Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', height: '100%' }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: 'var(--on-primary)' }}>
              <Terminal size={17} />
            </span>
            PersonalOS
          </Link>

          <nav style={{ display: 'flex', alignItems: 'stretch', height: '100%', gap: '0.25rem' }}>
            <Link to="/dashboard" style={navLinkStyle('/dashboard', true)}>
              <LayoutDashboard size={17} />
              Overview
            </Link>
            <Link to="/dashboard/resume" style={navLinkStyle('/dashboard/resume')}>
              <FileText size={17} />
              Resume Studio
            </Link>
            <Link to="/dashboard/portfolio" style={navLinkStyle('/dashboard/portfolio')}>
              <Globe size={17} />
              Portfolio Studio
            </Link>
            <Link to="/dashboard/activity" style={navLinkStyle('/dashboard/activity')}>
              <Zap size={17} />
              Activity Tracker
            </Link>
          </nav>
        </div>

        {/* Right: Theme + User + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ThemeToggle />
          <div style={{ position: 'relative' }} onMouseLeave={() => setMenuOpen(false)}>
            <button
              onClick={() => setMenuOpen(open => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-soft)', padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-md)' }}
            >
              <UserCircle size={19} />
              <span style={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                {user.name}
              </span>
              <ChevronDown size={15} />
            </button>
            {menuOpen && (
              <div role="menu" style={{ position: 'absolute', right: 0, top: '100%', minWidth: '220px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', padding: '0.35rem', zIndex: 60 }}>
                <div style={{ padding: '0.5rem 0.65rem', fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
                <Link role="menuitem" to="/extension" style={{ display: 'block', padding: '0.5rem 0.65rem', fontSize: '0.88rem', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)' }}>
                  Browser extension
                </Link>
                <Link role="menuitem" to="/privacy" style={{ display: 'block', padding: '0.5rem 0.65rem', fontSize: '0.88rem', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)' }}>
                  Privacy policy
                </Link>
                <button role="menuitem" onClick={handleLogoutEverywhere} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.65rem', fontSize: '0.88rem', color: 'var(--danger)', borderRadius: 'var(--radius-sm)' }}>
                  Log out of all devices
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.8rem', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content (Full Width) */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Page Title */}
        <div style={{ padding: '2rem 2rem 0', width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
           <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
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

