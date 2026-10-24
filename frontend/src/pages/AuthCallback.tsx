import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * Landing page after Google sign-in. The backend has set the httpOnly refresh cookie (no token ever
 * appears in the URL); AuthProvider exchanges it for an access token on load, then we route onward.
 */
const AuthCallback: React.FC = () => {
  const { user, isLoading } = useContext(AuthContext);
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-color)' }}>
        Signing you in…
      </div>
    );
  }
  return <Navigate to={user ? '/dashboard' : '/login?error=google_failed'} replace />;
};

export default AuthCallback;
