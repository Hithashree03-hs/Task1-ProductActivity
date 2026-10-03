import { Router } from 'express';
import auth from '../middleware/auth';
import { addToCart } from '../controllers/cartController';

const router = Router();

router.post('/add', auth, addToCart);

export default router;