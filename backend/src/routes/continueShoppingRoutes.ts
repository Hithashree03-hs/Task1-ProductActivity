import { Router } from 'express';
import auth from '../middleware/auth';
import { getContinueShopping } from '../controllers/continueShoppingController';

const router = Router();

router.get('/', auth, getContinueShopping);

export default router;