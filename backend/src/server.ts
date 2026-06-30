import express from 'express';
import cors from 'cors';
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

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/leetcode', leetcodeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/activity', activityRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});

// Database and Server Setup
const PORT = process.env.PORT || 6500;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
