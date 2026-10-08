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
import NotificationLog from './models/NotificationLog';
import { sendNotification } from './controllers/notificationController';

dotenv.config();

const app = express();

app.use(cors());
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

    // Dispatch due scheduled reminders and retain each attempt in the notification log.
    setInterval(async () => {
      try {
        const due = await NotificationLog.find({ status: 'SCHEDULED', scheduledAt: { $lte: new Date() } }).sort({ scheduledAt: 1 }).limit(50);
        for (const item of due) {
          await sendNotification(item.userId.toString(), item.category, item.title, item.body);
          item.status = 'SENT';
          await item.save();
        }
      } catch (error) { console.error('Scheduled notification dispatch failed:', error); }
    }, 60_000);

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
