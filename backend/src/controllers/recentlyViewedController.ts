import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  recordProductView,
  getRecentlyViewedProducts,
  mergeRecentlyViewed,
} from '../services/recentlyViewedService';

// Record a product view
export const recordView = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const { productId } = req.body;

    if (!productId) {
      res.status(400).json({
        message: 'productId is required',
      });
      return;
    }

    await recordProductView(req.userId, productId);

    res.status(200).json({
      message: 'Product view recorded',
    });
  } catch (error) {
    console.error('Record view error:', error);

    res.status(500).json({
      message: 'Failed to record product view',
    });
  }
};

// Get recently viewed products
export const getRecentlyViewed = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const products = await getRecentlyViewedProducts(req.userId);

    res.status(200).json({
      products,
    });
  } catch (error) {
    console.error('Get recently viewed error:', error);

    res.status(500).json({
      message: 'Failed to fetch recently viewed products',
    });
  }
};

// Merge anonymous/local history after login
export const mergeViewedHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const { localHistory } = req.body;

    if (!Array.isArray(localHistory)) {
      res.status(400).json({
        message: 'localHistory must be an array',
      });
      return;
    }

    await mergeRecentlyViewed(req.userId, localHistory);

    const products = await getRecentlyViewedProducts(req.userId);

    res.status(200).json({
      message: 'Recently viewed history merged successfully',
      products,
    });
  } catch (error) {
    console.error('Merge viewed history error:', error);

    res.status(500).json({
      message: 'Failed to merge recently viewed history',
    });
  }
};