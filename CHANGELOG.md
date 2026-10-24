# Changelog

All notable changes to DeveloperOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v200.html).

## [2.0.0] - 2026-10-25

### Changed
- **Backend rewritten in Python (FastAPI + Beanie)**, replacing the Node/Express backend. All data is now stored per user in MongoDB (Atlas or a local container).
- **Docker**: one `docker compose up` runs MongoDB, the API, the chat service and the frontend. Containers run as non-root, and `JWT_SECRET` is required with no default.
- **Professional dark and light themes** with a toggle. The Overview layout was rebalanced so GitHub, LeetCode and GeeksforGeeks sit side by side.
- **Resume Studio** now uses a classic one-page template, and the live preview mirrors the exported PDF exactly. It no longer invents contact details, education or certifications.

### Added
- **GeeksforGeeks integration**: problems by difficulty, coding score, streaks, institute rank, languages.
- **Secure authentication**: email sign-up verified by a one-time code, Sign in with Google (OIDC + PKCE), password reset by code, 15-minute in-memory access tokens with rotating `httpOnly` refresh cookies and stolen-token detection, account lockout, security headers, and an activity-only token for the browser extension.
- **Rate limits**: per-IP limits on auth endpoints, and per-account limits on LLM-backed endpoints (assistant: 10/min, 200/day).
- **RAG pipeline upgrade**: per-user vector indexes, a repository catalog document, hybrid BM25 + embedding retrieval, evidence-first context and automatic re-indexing. Includes a 46-question benchmark (`chat-service/eval`). Accuracy went from 93.5% to 100%; see `docs/RAG_EVALUATION.md`.

### Fixed
- **Chat service**: it shared one vector index across all users and had no authentication.
- **Retired LLM**: the Groq model `llama-3.1-8b-instant` was retired, which broke the assistant and insights.
- **Crashes and data bugs**: resume creation, the knowledge-graph rebuild, GitHub sync with an expired token, frozen timestamps, mass-assignment in update endpoints, and unescaped text in the PDF/portfolio exports.

## [1.0.0] - 2026-07-01 — Production Release (DeveloperOS v1.0)

### Added
- **Production Infrastructure**: Complete multi-stage Dockerfiles for backend and frontend, plus full orchestration via `docker-compose.yml`.
- **Automated CI/CD**: GitHub Actions pipeline verifing build integrity across `backend`, `frontend`, and `extensions/chrome`.
- **Security Hardening**: Integrated `helmet` security headers, `compression` payload optimization, and `express-rate-limit` DDoS/brute-force defense.
- **Centralized Frontend API**: Created `src/lib/api.ts` with `API_BASE_URL` configurable via `VITE_API_URL` environment variables.
- **Environment Templates**: Added complete `.env.example` onboarding files across all subprojects.
- **Dynamic UI Polish**: Active navigation link highlighting and location-aware dynamic headers in `DashboardLayout.tsx`.

### Fixed
- **Auth Middleware Double-Response**: Restructured `protect` middleware logic with explicit early returns to eliminate "Headers already sent" runtime errors.
- **JWT Security Vulnerability**: Removed insecure default `'secret123'` fallback strings; server now mandates secure `JWT_SECRET` initialization.
- **GitHub OAuth Port Mismatch**: Fixed callback redirects to reference configured `FRONTEND_URL` rather than hardcoded legacy port `5173`.
- **Dashboard Real Data**: Replaced hardcoded `activeProjectsCount = 3` with live repository statistics aggregated from GitHub.
- **Timeline Pagination**: Implemented paginated querying on `/api/dashboard/timeline` to prevent memory bloat over long developer histories.
- **Productivity Score Accuracy**: Refactored analytics engine to account for repository count as a proxy contributor when GitHub commit GraphQL counts are uninitialized.
- **Auth Input Validation**: Added strict validation rules (name length, email format, minimum password length) to authentication routes.

---

## Historical Phases (v0.1.0 - v0.9.0)

### [0.8.0] - Phase 8 — Browser Extension & Automatic Activity Synchronization
- Manifest V3 Chromium extension tracking activity on GitHub, LeetCode, HackerRank, Codeforces, GeeksforGeeks, and Stack Overflow.
- Real-time event deduplication and SPA navigation detection using Webpack source maps.

### [0.7.0] - Phase 7 — Automated Portfolio Generator
- Interactive portfolio studio with 4 curated themes (`modern-dark`, `minimal-light`, `cyberpunk`, `glassmorphism`).
- Automated JSON and ZIP deployment bundle export capabilities.

### [0.6.0] - Phase 6 — AI-Powered Resume Studio
- Tailored ATS-optimized resume generator leveraging Knowledge Graph intelligence.
- High-resolution PDF export pipeline using `pdfkit`.

### [0.5.0] - Phase 5 — Developer Intelligence Engine
- Multi-dimensional skill assessments calculating DSA, Frontend, Backend, DevOps, and Interview Readiness scores.

### [0.4.0] - Phase 4 — Knowledge Graph & Skill Mapping
- Force-directed 2D graph mapping relationships between languages, repositories, and inferred concepts.

### [0.3.0] - Phase 3 — LeetCode & Coding Platform Integrations
- Automated problem-solving tracker categorizing Easy, Medium, and Hard problem completions and streaks.

### [0.2.0] - Phase 2 — GitHub Integration & Repository Analytics
- OAuth integration fetching user profiles, repository hierarchies, star aggregations, and language breakdown maps.

### [0.1.0] - Phase 1 — Core Architecture & Dashboard Foundation
- Clean Architecture backend setup with Express, MongoDB, and JWT authentication.
- Responsive Vite React frontend layout with dark-mode glassmorphism design system.
