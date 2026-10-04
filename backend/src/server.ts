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

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

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