import React from 'react';
import { Link } from 'react-router-dom';
import AuthTopBar from '../components/AuthTopBar';
import './InfoPage.css';

const CONTACT_URL = 'https://github.com/nikhilkumar905/DeveloperOS/issues';

const PrivacyPage: React.FC = () => (
  <div className="info-page">
    <AuthTopBar />
    <div className="info-content animate-fade-in">
      <h1>Privacy Policy</h1>
      <p className="info-lead">Last updated: 25 October 2026</p>

      <p>
        This policy explains what DeveloperOS (also shown as PersonalOS) collects, why, and the choices you have. It
        covers the website at <code>developeros.page</code>, its APIs, and the DeveloperOS browser extension.
      </p>

      <h2>What we collect</h2>
      <h3>Account information</h3>
      <ul>
        <li>Your name and email address.</li>
        <li>Your password, which is stored only as a secure bcrypt hash and never in readable form. If you use Sign in with Google, we receive your name, email address and Google account ID from Google, but not your Google password.</li>
      </ul>
      <h3>Platforms you choose to connect</h3>
      <ul>
        <li><strong>GitHub:</strong> your public profile and repository information (names, descriptions, languages, dependencies, file structure, stars, pull-request and issue counts). We store the access token GitHub issues, so we can refresh this data. You can disconnect at any time, which deletes the token.</li>
        <li><strong>LeetCode and GeeksforGeeks:</strong> the username you enter and the public statistics on that profile.</li>
      </ul>
      <h3>Content you create</h3>
      <ul>
        <li>Resume details, portfolio settings, goals, and messages you send to the AI assistant.</li>
      </ul>
      <h3>Browser extension activity (only if you install and connect it)</h3>
      <ul>
        <li>On supported coding and documentation sites only, the extension records the site, page title and address, the time you were active, and problem or repository names.</li>
        <li>It doesn't run on other websites. It doesn't read passwords, form contents or messages.</li>
      </ul>
      <h3>Technical data</h3>
      <ul>
        <li>Your IP address and request metadata are processed to protect the service (for example rate limiting and preventing password guessing) and may appear briefly in server logs.</li>
        <li>We don't use advertising or tracking cookies.</li>
        <li>The only cookie is a secure login cookie that keeps you signed in. Your theme choice is saved in your browser's local storage.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide the dashboard, statistics, activity tracking, knowledge graph, resume and portfolio features.</li>
        <li>To generate AI insights and answer your questions in the AI assistant (see “Service providers” below).</li>
        <li>To send you account emails: verification and password-reset codes. We don't send marketing email.</li>
        <li>To keep the service secure.</li>
      </ul>
      <p>We don't sell your data and don't share it with advertisers.</p>

      <h2>Service providers</h2>
      <p>We use these providers to run DeveloperOS; each processes data only to provide its service:</p>
      <ul>
        <li><strong>MongoDB Atlas:</strong> database hosting.</li>
        <li><strong>Render</strong> and <strong>Vercel:</strong> application hosting.</li>
        <li><strong>Groq:</strong> the AI model. Relevant parts of your profile and your question are sent to generate answers and insights.</li>
        <li><strong>Google:</strong> Sign in with Google, and Gmail for sending account emails.</li>
        <li><strong>GitHub, LeetCode, GeeksforGeeks:</strong> the sources of the profile data you choose to connect.</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>Disconnect GitHub, LeetCode or GeeksforGeeks at any time from the Overview page; their data is removed.</li>
        <li>Clear all tracked activity from the Activity Tracker page, or uninstall the extension to stop tracking.</li>
        <li>Use “Log out of all devices” (in the account menu) or reset your password to revoke all sessions and extension access.</li>
        <li>To get a copy of your data or have your account deleted, contact us using the link below.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Traffic is encrypted with HTTPS. Passwords are hashed. Sign-in uses short-lived tokens. Access to each account's
        data is restricted to that account. No system is perfectly secure, but we work to protect your information.
      </p>

      <h2>Children</h2>
      <p>DeveloperOS isn't directed at children under 13, and we don't knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>If this policy changes, we'll update the date above. Significant changes will be announced in the app.</p>

      <h2>Contact</h2>
      <p>
        Questions or requests (including data export or deletion): <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer">open an issue on GitHub</a>.
      </p>
    </div>
    <div className="info-footer-links">
      <Link to="/">Home</Link>
      <Link to="/extension">Browser extension</Link>
      <a href="https://github.com/nikhilkumar905/DeveloperOS" target="_blank" rel="noopener noreferrer">GitHub</a>
    </div>
  </div>
);

export default PrivacyPage;
