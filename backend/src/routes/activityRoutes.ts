import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  logActivity,
  getActivityFeed,
  getActivitySummary,
  getWeeklyActivity,
  getHeatmapData,
  getActivitySettings,
  updateActivitySettings,
  clearActivityLogs,
} from '../controllers/activityController';

const router = Router();

// All routes require authentication
router.use(protect);

router.post('/log', logActivity);
router.get('/feed', getActivityFeed);
router.get('/summary', getActivitySummary);
router.get('/weekly', getWeeklyActivity);
router.get('/heatmap', getHeatmapData);
router.get('/settings', getActivitySettings);
router.put('/settings', updateActivitySettings);
router.delete('/logs', clearActivityLogs);

export default router;
