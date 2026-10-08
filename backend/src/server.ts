import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';

import connectDB from './config/db';
import { initializeSocket } from './sockets/server';

import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import recentlyViewedRoutes from './routes/recentlyViewedRoutes';
import continueShoppingRoutes from './routes/continueShoppingRoutes';
import cartRoutes from './routes/cartRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import orderRoutes from './routes/orderRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import preferencesRoutes from './routes/preferencesRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { dispatchScheduledNotifications, processPushReceipts, scheduleAbandonedCartReminders } from './controllers/notificationController';
import { internalEventWebhook, paymentWebhook } from './controllers/webhookController';

dotenv.config();

const app = express();

app.use(cors());
app.post('/api/webhooks/payment', express.raw({ type: 'application/json', limit: '256kb' }), paymentWebhook);
app.post('/api/internal/events', express.raw({ type: 'application/json', limit: '256kb' }), internalEventWebhook);
app.use(express.json());

// Health check
app.get('/', (_req, res) => {
  res.json({
    message: 'Task 1 backend is running',
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

app.use('/api/products', productRoutes);

app.use('/api/recently-viewed', recentlyViewedRoutes);

// Continue Shopping routes
app.use('/api/continue-shopping', continueShoppingRoutes);

// Cart routes
app.use('/api/cart', cartRoutes);

// Wishlist routes
app.use('/api/wishlist', wishlistRoutes);

// Order routes
app.use('/api/orders', orderRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    setInterval(() => { void dispatchScheduledNotifications().catch((error) => console.error('Scheduled notification dispatch failed:', error)); }, 60_000);
    setInterval(() => { void scheduleAbandonedCartReminders().catch((error) => console.error('Cart reminder scheduling failed:', error)); }, 5 * 60_000);
    setInterval(() => { void processPushReceipts().catch((error) => console.error('Expo receipt processing failed:', error)); }, 15 * 60_000);

    const httpServer = createServer(app);

    initializeSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );

      console.log(
        'Socket.IO server initialized'
      );
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
