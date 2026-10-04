import { Response } from 'express';

import { AuthRequest } from '../middleware/auth';

import Cart from '../models/Cart';
import Product from '../models/Product';

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

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({
        message: 'Invalid productId',
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

    const userObjectId =
      new mongoose.Types.ObjectId(req.userId);

    const productObjectId =
      new mongoose.Types.ObjectId(productId);

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
        (item) =>
          item.productId.toString() === productId
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

    res.status(200).json({
      message: 'Product added to cart',
      cart,
    });
  } catch (error) {
    console.error(
      'Add to cart error:',
      error
    );

    res.status(500).json({
      message: 'Failed to add product to cart',
    });
  }
};

export const updateCartQuantity = async (
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

    const productId = req.params.productId as string;
    const { quantity } = req.body;

    if (!productId) {
      res.status(400).json({
        message: 'productId is required',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({
        message: 'Invalid productId',
      });
      return;
    }

    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity)
    ) {
      res.status(400).json({
        message: 'quantity must be an integer',
      });
      return;
    }

    const cart = await Cart.findOne({
      userId: new mongoose.Types.ObjectId(
        req.userId
      ),
    });

    if (!cart) {
      res.status(404).json({
        message: 'Cart not found',
      });
      return;
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      res.status(404).json({
        message: 'Product not found in cart',
      });
      return;
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity =
        quantity;
    }

    await cart.save();

    res.status(200).json({
      message:
        quantity <= 0
          ? 'Product removed from cart'
          : 'Cart quantity updated',
      cart,
    });
  } catch (error) {
    console.error(
      'Update cart quantity error:',
      error
    );

    res.status(500).json({
      message: 'Failed to update cart quantity',
    });
  }
};

export const getCart = async (
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

    const cart = await Cart.findOne({
      userId: new mongoose.Types.ObjectId(
        req.userId
      ),
    })
      .populate('items.productId')
      .lean();

    if (!cart) {
      res.status(200).json({
        cart: {
          items: [],
        },
      });
      return;
    }

    const validItems = cart.items.filter(
      (item) => item.productId !== null
    );

    res.status(200).json({
      cart: {
        ...cart,
        items: validItems,
      },
    });
  } catch (error) {
    console.error(
      'Get cart error:',
      error
    );

    res.status(500).json({
      message: 'Failed to load cart',
    });
  }
};