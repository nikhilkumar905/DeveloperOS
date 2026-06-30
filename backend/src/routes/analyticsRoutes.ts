import express from 'express';
import { getInsights, refreshInsights } from '../controllers/analyticsController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/insights', protect, getInsights);
router.post('/insights/refresh', protect, refreshInsights);

export default router;
