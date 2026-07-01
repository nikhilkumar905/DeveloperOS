# Changelog

All notable changes to DeveloperOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v200.html).

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
