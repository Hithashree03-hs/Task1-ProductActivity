import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  image: string;
  sizes: string[];
  colors: string[];
  colorImages?: Record<string, string>;
  stock: number;
  salesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    brand: {
      type: String,
      default: '',
      trim: true,
    },

    image: {
      type: String,
      required: true,
      trim: true,
    },

    sizes: {
      type: [String],
      default: [],
    },

    colors: {
      type: [String],
      default: [],
    },

    colorImages: {
      type: Map,
      of: String,
      default: undefined,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    salesCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ stock: 1, salesCount: -1, createdAt: -1 });
productSchema.index({ category: 1, stock: 1, createdAt: -1 });

const Product = mongoose.model<IProduct>(
  'Product',
  productSchema
);

export default Product;
