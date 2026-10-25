import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages & Layouts
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AuthCallback from './pages/AuthCallback';
import ExtensionPage from './pages/ExtensionPage';
import PrivacyPage from './pages/PrivacyPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import ResumeStudio from './pages/ResumeStudio';
import PortfolioGenerator from './pages/PortfolioGenerator';
import ActivityFeed from './pages/ActivityFeed';

const App: React.FC = () => {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/extension" element={<ExtensionPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="resume" element={<ResumeStudio />} />
            <Route path="portfolio" element={<PortfolioGenerator />} />
            <Route path="activity" element={<ActivityFeed />} />
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
