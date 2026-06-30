import express from 'express';
import { getStats, getGoals, createGoal, getNotifications, markNotificationRead, getTimeline } from '../controllers/dashboardController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/stats', getStats);
router.get('/goals', getGoals);
router.post('/goals', createGoal);
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.get('/timeline', getTimeline);

export default router;
