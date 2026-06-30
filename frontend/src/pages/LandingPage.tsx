import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Database, Code, Shield } from 'lucide-react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-container">
      <nav className="navbar glass-panel">
        <div className="logo">
          <Terminal className="logo-icon" />
          <span>PersonalOS</span>
        </div>
        <div className="nav-links">
          <Link to="/login" className="btn btn-secondary">Login</Link>
          <Link to="/register" className="btn btn-primary">Get Started</Link>
        </div>
      </nav>

      <main className="hero-section">
        <div className="hero-content">
          <h1 className="animate-fade-in text-gradient">
            The Ultimate Developer Operating System
          </h1>
          <p className="hero-subtitle animate-fade-in delay-100">
            Unify your GitHub activity, LeetCode progress, and knowledge graph in one stunning dashboard.
          </p>
          <div className="hero-actions animate-fade-in delay-200">
            <Link to="/register" className="btn btn-primary btn-large">Start Building</Link>
            <a href="#features" className="btn btn-secondary btn-large">Explore Features</a>
          </div>
        </div>

        <div className="features-grid" id="features">
          <div className="feature-card glass-panel animate-fade-in delay-100">
            <Database className="feature-icon text-primary" />
            <h3>Centralized Hub</h3>
            <p>Connect your GitHub and LeetCode to see all your dev activity.</p>
          </div>
          <div className="feature-card glass-panel animate-fade-in delay-200">
            <Code className="feature-icon text-secondary" />
            <h3>Skill Graph</h3>
            <p>Automatically track and visualize your technical skills over time.</p>
          </div>
          <div className="feature-card glass-panel animate-fade-in delay-300">
            <Shield className="feature-icon text-danger" />
            <h3>Private & Secure</h3>
            <p>Your data remains yours. Built with security best practices.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
