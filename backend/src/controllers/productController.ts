import { Request, Response } from 'express';
import Product from '../models/Product';

// Get all products
export const getProducts = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.status(200).json({
      products,
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      message: 'Failed to fetch products',
    });
  }
};

// Get one product by ID
export const getProductById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      product,
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      message: 'Failed to fetch product',
    });
  }
};