import { Router } from 'express';
import { getAuthUrl, callback, disconnect, getStats, sync } from '../controllers/githubController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/auth-url', protect, getAuthUrl);
router.get('/callback', callback);
router.post('/disconnect', protect, disconnect);
router.get('/stats', protect, getStats);
router.post('/sync', protect, sync);

export default router;
