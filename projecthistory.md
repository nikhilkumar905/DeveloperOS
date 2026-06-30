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

If you need to add new technologies to the graph, update the PATH_TO_TECH array in src/services/knowledgeGraphEngine.ts.
CRITICAL: Never use anchored regexes (^) for file paths, as they will break detection for Monorepos. Always use /(^|\/)/ to match paths securely.