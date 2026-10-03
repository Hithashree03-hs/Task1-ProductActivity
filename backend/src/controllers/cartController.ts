import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Cart from '../models/Cart';
import Product from '../models/Product';
import ProductActivity, {
  ActivityType,
} from '../models/ProductActivity';
import mongoose from 'mongoose';

export const addToCart = async (
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

    let cart = await Cart.findOne({
      userId: userObjectId,
    });

    if (!cart) {
      cart = await Cart.create({
        userId: userObjectId,
        items: [
          {
            productId: productObjectId,
            quantity: 1,
          },
        ],
      });
    } else {
      const existingItem = cart.items.find(
        (item) => item.productId.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.items.push({
          productId: productObjectId,
          quantity: 1,
        });
      }

      await cart.save();
    }

    await ProductActivity.findOneAndUpdate(
      {
        userId: userObjectId,
        productId: productObjectId,
        activityType: ActivityType.CART,
      },
      {
        $set: {
          viewedAt: new Date(),
        },
      },
      {
        upsert: true,
      }
    );

    res.status(200).json({
      message: 'Product added to cart',
      cart,
    });
  } catch (error) {
    console.error('Add to cart error:', error);

    res.status(500).json({
      message: 'Failed to add product to cart',
    });
  }
};