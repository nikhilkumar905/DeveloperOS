import express from 'express';
import { getPortfolioSettings, updatePortfolioSettings, getPortfolioPreview, exportPortfolioBundle } from '../controllers/portfolioController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/settings', getPortfolioSettings);
router.put('/settings', updatePortfolioSettings);
router.get('/preview', getPortfolioPreview);
router.get('/export/bundle', exportPortfolioBundle);

export default router;
