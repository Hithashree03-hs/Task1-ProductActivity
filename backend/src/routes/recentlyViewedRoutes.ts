import { Router } from 'express';
import auth from '../middleware/auth';
import {
  recordView,
  getRecentlyViewed,
  mergeViewedHistory,
} from '../controllers/recentlyViewedController';

const router = Router();

// Record a product view
router.post('/view', auth, recordView);

// Get recently viewed products
router.get('/', auth, getRecentlyViewed);

// Merge anonymous history after login
router.post('/merge', auth, mergeViewedHistory);

export default router;