import { Router } from 'express';
import auth from '../middleware/auth';
import { createRazorpayIntent, verifyRazorpayCheckout } from '../controllers/razorpayController';

const router = Router();
router.post('/razorpay/intents', auth, createRazorpayIntent);
router.post('/razorpay/intents/:intentId/verify', auth, verifyRazorpayCheckout);

export default router;
