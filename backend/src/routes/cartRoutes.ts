import { Router } from 'express';

import auth from '../middleware/auth';

import {
  addToCart,
  getCart,
  updateCartQuantity,
  saveForLater,
  moveToCart,
  removeSavedItem,
  validateCart,
} from '../controllers/cartController';

const router = Router();

// Get current user's cart
router.get(
  '/',
  auth,
  getCart
);

// Validate stock and current prices before checkout
router.post(
  '/validate',
  auth,
  validateCart
);

// Add product to cart
router.post(
  '/add',
  auth,
  addToCart
);

// Update cart quantity
// quantity <= 0 removes the item
router.patch(
  '/:productId',
  auth,
  updateCartQuantity
);

// Save a cart item for later
router.patch(
  '/save-for-later/:itemId',
  auth,
  saveForLater
);

// Move a saved item back to cart
router.patch(
  '/move-to-cart/:itemId',
  auth,
  moveToCart
);

// Permanently remove a saved item
router.delete(
  '/saved/:itemId',
  auth,
  removeSavedItem
);

export default router;
