import { Router } from 'express';
import auth from '../middleware/auth';
import { getPreferences, updatePreferences } from '../controllers/userPreferencesController';
const router = Router();
router.get('/', auth, getPreferences);
router.patch('/', auth, updatePreferences);
export default router;
