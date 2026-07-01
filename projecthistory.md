DeveloperOS (PersonalOS) - Complete Project History & State
Conversation ID: 1ff53db1-7da0-40e1-9ae2-d924444f0a69

This document contains the complete phase-by-phase development history, features, and architectural decisions made for DeveloperOS up to this point.

Please read this document carefully before continuing development to understand the existing context, database schemas, and background processes.

1. Project Overview & Tech Stack
DeveloperOS is an advanced developer dashboard and intelligence platform that aggregates data from GitHub and LeetCode to map out a developer's real-world skill set.

Frontend: React, Vite, Tailwind CSS, Recharts (for charts), react-force-graph-2d (for knowledge graph).
Backend: Node.js, Express, TypeScript, Mongoose.
Database: MongoDB Atlas.
2. Phase-by-Phase Development History
Phase 1: Foundation & Authentication
Set up the initial frontend and backend directories.
Implemented standard JWT-based Authentication.
Created User schema in MongoDB.
Built login, register, and protected route logic on the frontend.
Phase 2 & 3: External Integrations & Dashboard UI
Created the main Dashboard primitives (glassmorphism UI, grid layouts, widgets).
GitHub Integration: Implemented OAuth flow. Users are redirected to GitHub, and the callback saves an access token into the IntegrationProfile schema.
LeetCode Integration: Added logic to scrape/fetch LeetCode stats and populate DSA (Data Structures & Algorithms) metrics.
Phase 4: Data Aggregation & Base Models
Designed the GithubStats schema to hold repository details, stars, forks, languages, and PR/Issue counts.
Implemented background synchronization processes. When a user connects GitHub, the backend fetches their repositories in the background without blocking the UI.
Phase 5: Developer Intelligence Engine
Goal: Move away from simply displaying raw statistics (like "40% JavaScript") and instead generate true intelligence.
Features Built:
analyticsEngine.ts: A custom, rule-based analytics engine (built strictly without external AI/LLM APIs) that computes explicit scores: Developer Score, Skill Scores (DSA, Frontend, Backend, Full Stack), Consistency, Productivity, and Interview Readiness.
Contextual Roadmaps: Analyzes what a developer already knows to suggest the next logical step (e.g., if you know React/Express, it suggests Redis/GraphQL instead of basic tutorials).
Caches the intelligence results in the DeveloperIntelligence MongoDB collection for 24 hours to reduce compute load.
Phase 6: Developer Knowledge Graph (The Core Engine)
Goal: Build a multi-level Knowledge Graph (Developer → Domains → Skills → Concepts → Technologies → Projects).
Implementation: knowledgeGraphEngine.ts maps all extracted data into Nodes (IGraphNode) and Edges (IGraphEdge).
The Graph UI: Created an interactive 2D physics-based force graph on the frontend with pan, zoom, and node highlighting.
Cache Invalidation: Whenever the user clicks "Sync Now" on the dashboard, the backend wipes DeveloperIntelligence and KnowledgeGraph caches to force a fresh rebuild based on new data.
3. Deep Architectural Inference (The "Monorepo" Upgrade)
The most complex feature of the backend is how it determines a developer's skills. We explicitly stopped relying on GitHub's language percentages because they are highly inaccurate (e.g., a Python backend might be dwarfed by frontend JavaScript).

How it works:
Recursive Tree Fetching: The backend hits the GitHub API's recursive tree endpoint (/git/trees/{branch}?recursive=1) for the user's top 30 repos. It saves all file paths into GithubStats.repositories[].filePaths.
Monorepo-Aware Regex Matching: The graph engine uses relaxed regexes to detect architecture patterns even inside monorepos (server/, client/, backend/, api/).
/(^|\/)(src|server|backend|api)?\/?controllers\//i → Detects MVC Architecture.
/(^|\/)(src|server|backend|api)?\/?routes\//i → Detects REST APIs.
/(^|\/)Dockerfile$/i → Detects Docker.
Implicit Dependency Detection: Instead of just parsing package.json (which often fails in monorepos), the engine parses the node_modules folders directly from the GitHub file tree!
/(^|\/)node_modules\/express\//i → Grants Express / Backend points.
/(^|\/)node_modules\/mongoose\//i → Grants MongoDB points.
/(^|\/)node_modules\/react\//i → Grants React points.
4. Known Gotchas & Critical Rules for Future Development
GitHub Rate Limits & 401 Unauthorized:

GitHub OAuth tokens expire after 8 hours by default.
If the backend throws a 500 error during /api/github/sync or GithubService methods return empty arrays, it is almost certainly because the token has expired, returning a 401 Unauthorized.
Fix: The user must click Disconnect on the dashboard and Connect GitHub again to acquire a fresh token.
Mongoose Schema Strictness:

Mongoose silently strips fields that are not defined in the schema.
Ensure filePaths: { type: [String], default: [] } and dependencies: { type: [String], default: [] } are always preserved in the GithubStats schema.
Background Sync Latency:

syncGithubDataForUser() runs asynchronously in the background and takes ~10-15 seconds to fetch 30 repository trees.
The frontend might initially show old cached data (or zero scores) until the sync fully finishes and wipes the DeveloperIntelligence cache.
Regex Modifications:

- If you need to add new technologies to the graph, update the `PATH_TO_TECH` array in `src/services/knowledgeGraphEngine.ts`.
- **CRITICAL**: Never use anchored regexes (`^`) for file paths, as they will break detection for Monorepos. Always use `/(^|\/)/ to match paths securely.

---

## 5. Port Changes (Applied by User)
- **Backend**: Changed from `5000` → `6500` (`process.env.PORT || 6500`)
- **Frontend**: Changed from `5173` → `6501` (via `vite.config.ts`)
- **GitHub OAuth Callback redirect**: Updated to `http://localhost:6501`
- All frontend API calls updated from `http://localhost:5000` → `http://localhost:6500`

---

## 6. New Pages Added (Phases 7/8 prep)
- `ResumeStudio` — `/dashboard/resume` — AI-powered resume builder
- `PortfolioGenerator` — `/dashboard/portfolio` — Portfolio website generator
- `resumeRoutes` and `portfolioRoutes` registered at `/api/resume` and `/api/portfolio`

---

## 7. Phase 8: Browser Extension & Activity Synchronization

### Extension Location
`extensions/chrome/` — built as a Manifest V3 Chrome Extension using TypeScript + Webpack.

### How to Load in Chrome
1. Run `npm run build:dev` inside `extensions/chrome/`
2. Open `chrome://extensions` → Enable Developer Mode
3. Click **Load Unpacked** → select `extensions/chrome/dist/`
4. Click the extension icon → paste your PersonalOS JWT token

### Extension Architecture

**`src/background.ts`** (Service Worker):
- Maintains a `chrome.storage.local` buffer of `ActivityEvent[]`
- Creates a `chrome.alarms` timer that flushes the buffer to `POST /api/activity/log` every 5 minutes
- Tracks active tab time via `chrome.tabs.onActivated`
- Authenticates using the user's stored JWT token

**Content Scripts (per platform):**
| File | Domain | Detects |
|------|--------|---------|
| `content/github.ts` | github.com | Repo visits, code views, PR/issue views |
| `content/leetcode.ts` | leetcode.com | Problem views, solved (via MutationObserver on result), attempts |
| `content/hackerrank.ts` | hackerrank.com | Challenge views, completions |
| `content/codeforces.ts` | codeforces.com | Problem views, contest participation, verdicts |
| `content/gfg.ts` | geeksforgeeks.org | Article reads, problem views with difficulty |
| `content/stackoverflow.ts` | stackoverflow.com | Question views with tags |
| `content/docs.ts` | MDN, React, Next.js, Python, Node.js | Reading time tracking |

**`src/popup/popup.tsx`** (React UI):
- Shows today's stats: coding time, problems solved, streak
- Platform-by-platform enable/disable toggles (saved to `chrome.storage.local`)
- Manual "Sync Now" button
- Connect/Disconnect flow using JWT token paste

### Backend (Phase 8)
- **`models/ActivityLog.ts`**: Individual activity events (platform, type, metadata, duration, timestamp)
- **`models/ActivitySession.ts`**: Daily aggregated sessions (totalTimeMs, platformBreakdown, streak, productivityScore)
- **`services/activityAggregator.ts`**: Rebuilds daily sessions on new event ingestion; calculates streak
- **`controllers/activityController.ts`**: REST endpoints for log, feed, summary, weekly, heatmap, settings
- **`routes/activityRoutes.ts`**: All routes under `/api/activity`, all protected by JWT

### REST API Endpoints (Phase 8)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/activity/log` | Batch-ingest events from extension |
| GET | `/api/activity/feed` | Paginated activity log with platform filter |
| GET | `/api/activity/summary` | Today's summary + streak + recent activity |
| GET | `/api/activity/weekly` | Last 7 days for charts |
| GET | `/api/activity/heatmap` | Last 90 days for calendar heatmap |
| GET | `/api/activity/settings` | Get per-platform tracking settings |
| PUT | `/api/activity/settings` | Update per-platform settings |

### Frontend (Phase 8)
- **`pages/ActivityFeed.tsx`**: Full-page view with 90-day heatmap, weekly bar chart, paginated feed, platform filters, and platform time breakdown panel
- **`components/ActivityWidget.tsx`**: Dashboard home widget showing today's time, solved count, streak, mini weekly bars, and recent activity list
- **`layouts/DashboardLayout.tsx`**: Updated with ⚡ Activity Tracker nav link
- **`App.tsx`**: Added `/dashboard/activity` route

### Key Rules for Phase 8
- The extension buffers events locally and sends them in batches (never one-by-one per DOM event)
- MutationObserver is used on LeetCode to detect the submission result without page reloads
- All activity events include `duration` in milliseconds — content scripts track time-on-page
- The `activitySettings` field on `IntegrationProfile` stores per-platform toggle state server-side

---

## 8. Phase 8 Bug Fixes & Single-Page Application (SPA) Support

### Webpack CSP & Eval Fix
- **Problem**: Webpack development build mode injected `eval()` wrapper blocks in compiled extension source code, violating Chrome's strict Manifest V3 Content Security Policy (CSP) for Service Workers.
- **Fix**: Adjusted `webpack.config.js` to set `devtool: 'source-map'` and compiled the extension with production configurations (`npm run build`). This completely removed `eval()` from the output `background.js` and content scripts.

### Extension Token Management
- Added a **"🔑 Copy Token"** utility directly inside the `ActivityWidget` on the React web dashboard. Users can copy their current JWT token with one click and paste it into the Chrome extension popup.

### MutationObserver Deduplication & Duration Capping
- **Problem**: MutationObservers on coding platforms (LeetCode, Codeforces, HackerRank) triggered multiple times during DOM animation shifts, generating dozens of duplicate events. Combined with overnight open tabs, this resulted in erroneous tracking metrics like "93h 34m" coding time.
- **Fix**:
  - Implemented a `hasReportedSolved` lock in the observers to prevent duplicate triggers on the same problem.
  - Added duration capping (max 1 hour per continuous interval).
  - Reset `entryTime = Date.now()` after sending events to keep subsequent timings fresh.
  - Added a relative timestamp helper (`formatTimestamp`) to the extension popup, changing the right-hand column from raw event duration to relative times (e.g., "4m ago").

### GitHub SPA (Turbo) & Push Detection
- **Problem**: GitHub operates as a single-page app (SPA) using HTML5 History API (Turbo). Traditional `pagehide`/`beforeunload` listeners missed internal page navigations. It also lacked a way to record repository commits and pushes.
- **Fix**:
  - **SPA Support**: Intercepted `history.pushState` and added `popstate` event listeners to catch url changes within GitHub.
  - **Push Detection**: Added support for detecting when a user views commit branches (`commits/` or `compare/`) or when GitHub displays a successful push template flash banner.
  - **New Activity Types**: Added `repo_push` (🚀 Pushed to) and `repo_commit_view` (Viewed commit) end-to-end (manifest types, backend schema, aggregator, dashboard widgets, and pages).

---

## 9. Phase 10 Production Release Audit (v1.0.0)

### Production Readiness & Infrastructure
- **Containerization**: Created multi-stage high-performance Dockerfiles for `backend` and `frontend` (served via Nginx SPA configuration), orchestrated by `docker-compose.yml`.
- **Automated CI/CD**: Created `.github/workflows/ci.yml` verifying TypeScript compilation, linting, and production bundles for backend, frontend, and browser extension on push/PR.
- **Security Hardening**: Integrated `helmet` HTTP headers, `compression` payload optimization, strict CORS whitelist filtering, and two-tier rate limiting (`authLimiter` at 20 req/15m and `apiLimiter` at 300 req/15m).
- **Environment Management**: Centralized frontend API communications via `src/lib/api.ts` (`VITE_API_URL`) and provided comprehensive `.env.example` templates across all subdirectories.

### Critical Bug Fixes
- **Auth Middleware Double-Response**: Restructured `protect` middleware in `authMiddleware.ts` with explicit early returns to eliminate "Headers already sent" runtime errors.
- **Insecure JWT Secrets**: Removed dangerous `'secret123'` fallback values across authentication endpoints, ensuring instant failure on missing `JWT_SECRET`.
- **GitHub OAuth Port Fix**: Updated OAuth callback redirection to dynamically reference `FRONTEND_URL` rather than hardcoded port `5173`.
- **Dynamic Dashboard Metrics**: Replaced hardcoded `activeProjectsCount = 3` with real repository counts from `GithubStats`, implemented timeline pagination (`?page=1&limit=20`), and refined productivity scores to account for repository count when GraphQL commits are unavailable.
- **Input Validation**: Added strict validation rules (name length >= 2, valid email regex, password length >= 8) to user registration and login endpoints.

---

## 10. Phase 11: Advanced Resume Builder layout, Separate URLs, and Repo Selector

### Layout & Formatting Improvements
- **Unicode PDF Bullet Fix**: Replaced standard Unicode `●` bullet character rendering (which generated `% 1` encoding artifacts in PDFkit standard fonts) with custom vector-drawn circles (`doc.circle`).
- **LaTeX Layout Symmetry**: Refactored generated PDF spacing, margins, and horizontal section divider lines to precisely mimic the user's LaTeX `resume.xml` template.
- **Space Protection**: Implemented exact `******` placeholder output for any missing personal contact fields (email, phone, linkedin, github, location) to prevent horizontal layout compression or space vulnerability shifts.

### GitHub Integration & Project Customization
- **Separate GitHub & Live Hyperlinks**: Decoupled project link rendering. GitHub and Live links are now drawn as separate, independent click targets with distinct hyperlinks.
- **Intelligent URL Extraction**: Synced repositories now store their `homepage` URL. The engine scans the repository homepage, description, and README markdown files for live deployment URL patterns to auto-fill `liveUrl`. It automatically normalizes naked domains (e.g., `crowd-source-disaster-management.vercel.app` without `http`/`https`) by prepending `https://` to ensure valid click targets.
- **Manual GitHub Project Selector**: Added a React-based **"⚡ Import from GitHub"** modal in Resume Studio. Users can browse their synced GitHub repositories, select a project, automatically generate customizable bullet points based on project details, and manually edit the name, stack, URLs, and bullets.

### Extension Fast Sync & Strict GitHub Push Tracking
- **Instant Syncing**: Updated extension background worker to immediately trigger `flushBuffer()` whenever priority events (`problem_solved`, `repo_push`, `repo_commit_view`) occur, and reduced routine sync interval from 5 minutes to 1 minute.
- **Strict Push & Commit Tracking**: Removed generic `repo_visit` and `repo_code_view` tracking from GitHub content script so it strictly tracks commits, branch comparisons, PRs, issues, and push flash banners.
- **LeetCode SPA & Precise Verdict Detection**: Hooked `history.pushState` and `popstate` inside `leetcode.ts` to detect Next.js/React client-side problem navigations without page refreshes. Replaced fragile single `querySelector` with comprehensive DOM scanning across verdict elements (`Accepted`, `Wrong Answer`) inside submission containers without disconnecting.
- **Accurate Relative Timestamps**: Updated popup timestamp formatting to display exact seconds (e.g., `12s ago`) for events under 1 minute instead of generic `just now`.
- **Clear Activity History Control**: Added `DELETE /api/activity/logs` endpoint and a one-click **"🗑️ Clear Activity History"** button in the extension popup Settings tab so developers can wipe stored test logs and reset their feed at any time.
- **CORS Extension Origin Allowlist**: Updated Express server CORS middleware to allow browser extension origins (`chrome-extension://`).
