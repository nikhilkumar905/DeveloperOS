import express from 'express';
import { getGraph } from '../controllers/graphController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getGraph);

export default router;
