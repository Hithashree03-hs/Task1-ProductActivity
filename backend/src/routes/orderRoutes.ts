import { Router } from 'express';
import auth from '../middleware/auth';
import { createOrder } from '../controllers/orderController';

const router = Router();

router.post('/', auth, createOrder);

export default router;