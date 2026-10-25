import React from 'react';
import { Link } from 'react-router-dom';
import { Download, Store, Puzzle } from 'lucide-react';
import AuthTopBar from '../components/AuthTopBar';
import './InfoPage.css';

// Set VITE_EXTENSION_STORE_URL once the extension is published on the Chrome Web Store
const STORE_URL = import.meta.env.VITE_EXTENSION_STORE_URL as string | undefined;
const DOWNLOAD_URL = '/downloads/developeros-extension.zip';

const ExtensionPage: React.FC = () => (
  <div className="info-page">
    <AuthTopBar />
    <div className="info-content animate-fade-in">
      <Puzzle size={40} style={{ color: 'var(--primary)' }} />
      <h1>DeveloperOS browser extension</h1>
      <p className="info-lead">
        Tracks the time you spend coding on GitHub, LeetCode, GeeksforGeeks, HackerRank, Codeforces, Stack Overflow and
        popular documentation sites, and feeds it into your Activity Tracker: daily time, problems solved, streaks and a
        90-day heatmap.
      </p>

      <div className="info-card">
        <h3 style={{ marginTop: 0 }}>Get the extension</h3>
        <div className="info-actions">
          {STORE_URL ? (
            <a className="btn btn-primary" href={STORE_URL} target="_blank" rel="noopener noreferrer">
              <Store size={17} /> Add to Chrome (Chrome Web Store)
            </a>
          ) : (
            <span className="btn btn-secondary" aria-disabled="true" style={{ cursor: 'default', opacity: 0.7 }}>
              <Store size={17} /> Chrome Web Store: coming soon
            </span>
          )}
          <a className={`btn ${STORE_URL ? 'btn-secondary' : 'btn-primary'}`} href={DOWNLOAD_URL} download>
            <Download size={17} /> Download (.zip) for manual install
          </a>
        </div>
        <p className="info-note">Works in Chrome, Edge, Brave and other Chromium browsers. Firefox and Safari aren't supported yet.</p>
      </div>

      {!STORE_URL && (
        <>
          <h2>Install from the download (about 1 minute)</h2>
          <ol>
            <li>Click <strong>Download (.zip)</strong> above and <strong>unzip</strong> it. You'll get a folder containing <code>manifest.json</code>.</li>
            <li>Open a new tab and go to <code>chrome://extensions</code> (Edge: <code>edge://extensions</code>). Type it into the address bar; websites can't open that page for you.</li>
            <li>Turn on <strong>Developer mode</strong> (switch in the top-right corner).</li>
            <li>Click <strong>Load unpacked</strong> and choose the unzipped folder.</li>
            <li>Click the puzzle-piece icon in the toolbar and <strong>pin</strong> DeveloperOS so it's always visible.</li>
          </ol>
          <p className="info-note">
            Keep the unzipped folder: Chrome loads the extension from it. To update, download the new zip, replace the folder's
            contents, and click the reload icon on the extension's card in <code>chrome://extensions</code>.
          </p>
        </>
      )}

      <h2>Connect it to your account</h2>
      <ol>
        <li><Link to="/login">Log in</Link> to DeveloperOS and open the <strong>Overview</strong> page.</li>
        <li>In the <strong>Activity Tracker</strong> card, click <strong>Copy Token</strong>.</li>
        <li>Click the DeveloperOS icon in your browser toolbar. The server is already set to <code>https://api.developeros.page</code>.</li>
        <li>Paste the token and click <strong>Connect Account</strong>.</li>
      </ol>
      <p>
        Now browse as usual. Activity is sent every few minutes and appears under <strong>Activity Tracker</strong> in the dashboard.
        You can switch individual sites on or off in the extension's settings tab.
      </p>

      <h2>What it can and can't see</h2>
      <ul>
        <li>It only runs on the supported coding and documentation sites listed above. It doesn't read any other site.</li>
        <li>It records the page title and address, the platform, how long you were active, and problem or repository names on those sites. It never reads passwords, form fields or private messages.</li>
        <li>The token you paste can <strong>only</strong> log and read activity. It can't access or change anything else in your account, and resetting your password or using “Log out of all devices” revokes it.</li>
      </ul>
      <p>
        See the <Link to="/privacy">privacy policy</Link> for details.
      </p>
    </div>
    <div className="info-footer-links">
      <Link to="/">Home</Link>
      <Link to="/privacy">Privacy</Link>
      <a href="https://github.com/nikhilkumar905/DeveloperOS" target="_blank" rel="noopener noreferrer">GitHub</a>
    </div>
  </div>
);

export default ExtensionPage;
