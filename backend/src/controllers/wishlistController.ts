import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Wishlist from '../models/Wishlist';
import Product from '../models/Product';
import mongoose from 'mongoose';
import { recordProductInteraction, removeProductInteraction } from '../services/recentlyViewedService';
import { ActivityType } from '../models/ProductActivity';

export const addToWishlist = async (
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

    const product = await Product.findById(productId);

    if (!product) {
      res.status(404).json({
        message: 'Product not found',
      });
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(req.userId);
    const productObjectId = new mongoose.Types.ObjectId(productId);

    let wishlist = await Wishlist.findOne({
      userId: userObjectId,
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId: userObjectId,
        products: [productObjectId],
      });
    } else {
      const alreadyExists = wishlist.products.some(
        (id) => id.toString() === productId
      );

      if (!alreadyExists) {
  wishlist.products.unshift(productObjectId);
  await wishlist.save();
      }
    }

    await recordProductInteraction(req.userId, productId, ActivityType.WISHLIST);

    res.status(200).json({
      message: 'Product added to wishlist',
      wishlist,
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);

    res.status(500).json({
      message: 'Failed to add product to wishlist',
    });
  }
};

export const getWishlist = async (
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

    const wishlist = await Wishlist.findOne({
      userId: new mongoose.Types.ObjectId(req.userId),
    })
      .populate('products')
      .lean();

    if (!wishlist) {
      res.status(200).json({
        products: [],
      });
      return;
    }

    res.status(200).json({
      products: wishlist.products,
    });
  } catch (error) {
    console.error('Get wishlist error:', error);

    res.status(500).json({
      message: 'Failed to load wishlist',
    });
  }
};
export const removeFromWishlist = async (
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

    const wishlist = await Wishlist.findOne({
      userId: new mongoose.Types.ObjectId(req.userId),
    });

    if (!wishlist) {
      res.status(404).json({
        message: 'Wishlist not found',
      });
      return;
    }

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId
    );

    await wishlist.save();

    await removeProductInteraction(req.userId, productId, ActivityType.WISHLIST);

    res.status(200).json({
      message: 'Product removed from wishlist',
      wishlist,
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);

    res.status(500).json({
      message: 'Failed to remove product from wishlist',
    });
  }
};
