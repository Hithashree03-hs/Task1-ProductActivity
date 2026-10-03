import { Router } from 'express';
import auth from '../middleware/auth';
import { addToWishlist } from '../controllers/wishlistController';

const router = Router();

router.post('/add', auth, addToWishlist);

export default router;