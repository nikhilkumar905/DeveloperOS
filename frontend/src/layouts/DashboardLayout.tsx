import React, { useContext } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Terminal, LayoutDashboard, UserCircle, LogOut, FileText, Globe } from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { user, logout, isLoading } = useContext(AuthContext);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)' }}>
          <Terminal style={{ color: 'var(--primary)' }} />
          <span>PersonalOS</span>
        </div>
        
        <nav style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontWeight: 500 }}>
            <LayoutDashboard size={20} />
            Overview
          </Link>
          <Link to="/dashboard/resume" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontWeight: 500 }}>
            <FileText size={20} style={{ color: '#10b981' }} />
            Resume Studio
          </Link>
          <Link to="/dashboard/portfolio" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontWeight: 500 }}>
            <Globe size={20} style={{ color: '#a855f7' }} />
            Portfolio Studio
          </Link>
        </nav>
        
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', color: 'var(--text-muted)' }}>
            <UserCircle size={24} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
          </div>
          <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem' }}>
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: '64px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', display: 'flex', alignItems: 'center', padding: '0 2rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Dashboard</h1>
        </header>
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
