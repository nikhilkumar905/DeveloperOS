import express from 'express';
import { connectLeetCode, disconnectLeetCode, syncLeetCode, getLeetCodeStats } from '../controllers/leetcodeController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/connect', protect, connectLeetCode);
router.post('/disconnect', protect, disconnectLeetCode);
router.post('/sync', protect, syncLeetCode);
router.get('/stats', protect, getLeetCodeStats);

export default router;
