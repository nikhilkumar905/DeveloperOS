import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import githubRoutes from './routes/githubRoutes';
import leetcodeRoutes from './routes/leetcodeRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import graphRoutes from './routes/graphRoutes';
import resumeRoutes from './routes/resumeRoutes';
import portfolioRoutes from './routes/portfolioRoutes';
import activityRoutes from './routes/activityRoutes';

dotenv.config();

// ─── Startup Validation ───────────────────────────────────────────────────────
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`[server] FATAL: Missing required environment variables: ${missing.join(', ')}`);
  console.error('[server] Copy backend/.env.example to backend/.env and fill in the values.');
  process.exit(1);
}

const app = express();

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow embedding for portfolio previews
}));
app.use(compression());

// CORS — allow only the configured frontend URL
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:6501',
  'http://localhost:6501', // always allow local dev
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, Postman) or browser extensions
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://') || origin.startsWith('safari-web-extension://')) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 auth requests per window
  message: { message: 'Too many auth requests, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/github', apiLimiter, githubRoutes);
app.use('/api/leetcode', apiLimiter, leetcodeRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/graph', apiLimiter, graphRoutes);
app.use('/api/resume', apiLimiter, resumeRoutes);
app.use('/api/portfolio', apiLimiter, portfolioRoutes);
app.use('/api/activity', apiLimiter, activityRoutes);

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'DeveloperOS API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] Unhandled error:', err.message);
  res.status(500).json({ message: 'An unexpected server error occurred' });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── Database & Server Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 6500;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] DeveloperOS API running on port ${PORT}`);
    console.log(`[server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch(err => {
  console.error('[server] Database connection failed:', err.message);
  process.exit(1);
});
