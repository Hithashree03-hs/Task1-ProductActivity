import { Router } from 'express';
import auth from '../middleware/auth';
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from '../controllers/wishlistController';

const router = Router();

router.post('/add', auth, addToWishlist);

router.delete('/remove', auth, removeFromWishlist);

router.get('/', auth, getWishlist);

export default router;