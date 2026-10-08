import { Router } from 'express';
import auth from '../middleware/auth';
import { createOrder, downloadInvoice, getOrders, reorderOrder, requestOrderAction } from '../controllers/orderController';

const router = Router();

router.post('/', auth, createOrder);
router.get('/', auth, getOrders);
router.get('/:orderId/invoice', auth, downloadInvoice);
router.post('/:orderId/reorder', auth, reorderOrder);
router.post('/:orderId/actions', auth, requestOrderAction);

export default router;
