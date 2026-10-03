import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getContinueShoppingProducts } from '../services/continueShoppingService';

export const getContinueShopping = async (
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

    const products = await getContinueShoppingProducts(req.userId);

    res.status(200).json({
      products,
    });
  } catch (error) {
    console.error('Continue shopping error:', error);

    res.status(500).json({
      message: 'Failed to fetch continue shopping products',
    });
  }
};