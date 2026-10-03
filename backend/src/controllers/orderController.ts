import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order from '../models/Order';
import Product from '../models/Product';
import mongoose from 'mongoose';

export const createOrder = async (
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

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        message: 'Order items are required',
      });
      return;
    }

    let totalAmount = 0;

    const orderItems = [];

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity || quantity < 1) {
        res.status(400).json({
          message: 'Each item requires productId and valid quantity',
        });
        return;
      }

      const product = await Product.findById(productId);

      if (!product) {
        res.status(404).json({
          message: `Product not found: ${productId}`,
        });
        return;
      }

      if (product.stock < quantity) {
        res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
        });
        return;
      }

      totalAmount += product.price * quantity;

      orderItems.push({
        productId: new mongoose.Types.ObjectId(productId),
        quantity,
        price: product.price,
      });
    }

    const order = await Order.create({
      userId: new mongoose.Types.ObjectId(req.userId),
      items: orderItems,
      totalAmount,
      status: 'COMPLETED',
    });

    res.status(201).json({
      message: 'Order created successfully',
      order,
    });
  } catch (error) {
    console.error('Create order error:', error);

    res.status(500).json({
      message: 'Failed to create order',
    });
  }
};