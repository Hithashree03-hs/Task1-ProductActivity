import { Router } from 'express';

import auth from '../middleware/auth';

import {
  addToCart,
  getCart,
  updateCartQuantity,
} from '../controllers/cartController';

const router = Router();

router.post(
  '/add',
  auth,
  addToCart
);

router.get(
  '/',
  auth,
  getCart
);

router.patch(
  '/:productId',
  auth,
  updateCartQuantity
);

export default router;