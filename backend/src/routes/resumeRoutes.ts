import express from 'express';
import { getResumeProfile, updateResumeProfile, inferResume, analyzeAts, exportResumePdf } from '../controllers/resumeController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/profile', getResumeProfile);
router.put('/profile', updateResumeProfile);
router.post('/infer', inferResume);
router.post('/analyze-ats', analyzeAts);
router.get('/export/pdf', exportResumePdf);

export default router;
