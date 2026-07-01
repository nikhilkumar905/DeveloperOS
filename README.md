# 🚀 DeveloperOS (PersonalOS) — v1.0 Production Release

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

**DeveloperOS** is the ultimate autonomous command center for modern software engineers. It unifies your digital footprint across GitHub, LeetCode, and technical documentation websites into a sleek, real-time operating system—automatically mapping your knowledge graph, calculating developer intelligence, and generating ATS-ready resumes and stunning portfolios on demand.

---

## ✨ Key Features

- **📊 Live Activity & Heatmap Tracker**: Automatically synchronizes developer sessions across GitHub, LeetCode, HackerRank, Stack Overflow, and technical documentation via a custom Manifest V3 browser extension.
- **🕸️ Force-Directed Knowledge Graph**: Automatically parses dependencies (`package.json`, `requirements.txt`) and file hierarchies to visualize connections between programming languages, frameworks, and core engineering concepts.
- **🧠 Developer Intelligence Engine**: Evaluates your GitHub contributions and coding habits to calculate comprehensive interview readiness, consistency scores, and actionable career roadmaps.
- **📄 AI Resume Studio**: Instantly generates tailored, ATS-optimized resumes in high-resolution PDF format using real-time insights from your repositories.
- **🌐 Automated Portfolio Generator**: Preview and export fully customized, responsive personal portfolio websites in 4 curated themes (`modern-dark`, `minimal-light`, `cyberpunk`, `glassmorphism`) as ready-to-deploy ZIP bundles.
- **🔒 Privacy-First Security**: Built with strict JWT authentication, Helmet HTTP header protection, rate limiting, and centralized CORS controls.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Vanilla CSS (Glassmorphism), ForceGraph2D |
| **Backend** | Node.js, Express 5, TypeScript, MongoDB (Mongoose 9), PDFKit |
| **Security** | Helmet, Compression, Express Rate Limit, JWT, bcryptjs |
| **Extension** | Chromium Manifest V3, Webpack 5, TypeScript |
| **DevOps** | Multi-stage Docker, Docker Compose, Nginx, GitHub Actions CI/CD |

---

## 🚀 Quick Start (Docker Compose)

The fastest way to run DeveloperOS locally is using Docker Compose:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/DeveloperOS.git
cd DeveloperOS

# 2. Copy environment variables
cp .env.example .env

# 3. Start fullstack services (MongoDB + Backend + Frontend)
docker-compose up --build
```

Access the frontend dashboard at **http://localhost:6501** and API server at **http://localhost:6500**.

---

## 💻 Manual Development Setup

If you prefer running modules directly on your host machine:

### 1. Prerequisites
- **Node.js** v20 or higher
- **MongoDB** running locally on port `27017` or a MongoDB Atlas URI

### 2. Backend Setup
```bash
cd backend
cp .env.example .env   # Fill in your MONGO_URI and JWT_SECRET
npm install
npm run dev            # Starts backend API on http://localhost:6500
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env   # Verifies VITE_API_URL points to http://localhost:6500
npm install
npm run dev            # Starts Vite development server
```

### 4. Browser Extension Setup
```bash
cd extensions/chrome
npm install
npm run build          # Builds Manifest V3 bundle into dist/
```
To load in Chrome/Edge:
1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** and select the `extensions/chrome/dist` folder.
4. Paste your JWT access token from the dashboard into the extension popup.

---

## 📁 Repository Structure

```
DeveloperOS/
├── backend/               # Express 5 REST API & Intelligence Engines
├── frontend/              # Vite React 19 SPA Dashboard
├── extensions/
│   └── chrome/            # Manifest V3 Automatic Activity Tracker
├── .github/workflows/     # Automated CI/CD Pipeline
├── docker-compose.yml     # Multi-container orchestration
├── PROJECT.md             # Detailed architecture & specifications
└── CHANGELOG.md           # Version release notes
```

---

## 🧪 Running Tests & Build Verification

To verify that all project components compile cleanly with zero TypeScript errors:

```bash
# Backend verification
cd backend && npm run build

# Frontend verification
cd ../frontend && npm run build

# Chrome Extension verification
cd ../extensions/chrome && npm run build
```

---

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.