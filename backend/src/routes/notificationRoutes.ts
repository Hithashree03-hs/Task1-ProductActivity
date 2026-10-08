import { Router } from 'express';
import auth from '../middleware/auth';
import { getNotificationHistory, registerToken } from '../controllers/notificationController';
const router = Router();
router.post('/devices', auth, registerToken);
router.get('/', auth, getNotificationHistory);
export default router;
