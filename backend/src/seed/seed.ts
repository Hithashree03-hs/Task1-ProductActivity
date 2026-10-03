import dotenv from 'dotenv';
import connectDB from '../config/db';
import Product from '../models/Product';

dotenv.config();

const products = [
  {
    name: 'Wireless Headphones',
    description: 'Comfortable wireless headphones with clear sound.',
    price: 2499,
    image: 'https://via.placeholder.com/300x300?text=Headphones',
    category: 'Electronics',
    stock: 25,
  },
  {
    name: 'Smart Watch',
    description: 'Smart watch with fitness and notification features.',
    price: 3999,
    image: 'https://via.placeholder.com/300x300?text=Smart+Watch',
    category: 'Electronics',
    stock: 20,
  },
  {
    name: 'Running Shoes',
    description: 'Lightweight running shoes for everyday workouts.',
    price: 2999,
    image: 'https://via.placeholder.com/300x300?text=Running+Shoes',
    category: 'Footwear',
    stock: 30,
  },
  {
    name: 'Laptop Backpack',
    description: 'Durable backpack with a dedicated laptop compartment.',
    price: 1499,
    image: 'https://via.placeholder.com/300x300?text=Backpack',
    category: 'Bags',
    stock: 40,
  },
  {
    name: 'Bluetooth Speaker',
    description: 'Portable Bluetooth speaker with powerful audio.',
    price: 1799,
    image: 'https://via.placeholder.com/300x300?text=Speaker',
    category: 'Electronics',
    stock: 35,
  },
  {
    name: 'Mechanical Keyboard',
    description: 'Mechanical keyboard designed for productivity and gaming.',
    price: 3499,
    image: 'https://via.placeholder.com/300x300?text=Keyboard',
    category: 'Electronics',
    stock: 18,
  },
  {
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with precise tracking.',
    price: 999,
    image: 'https://via.placeholder.com/300x300?text=Mouse',
    category: 'Electronics',
    stock: 50,
  },
  {
    name: 'USB-C Hub',
    description: 'Multi-port USB-C hub for laptops and tablets.',
    price: 1299,
    image: 'https://via.placeholder.com/300x300?text=USB-C+Hub',
    category: 'Accessories',
    stock: 45,
  },
  {
    name: 'Power Bank',
    description: 'High-capacity portable power bank.',
    price: 1599,
    image: 'https://via.placeholder.com/300x300?text=Power+Bank',
    category: 'Electronics',
    stock: 28,
  },
  {
    name: 'Phone Stand',
    description: 'Adjustable stand for smartphones and tablets.',
    price: 599,
    image: 'https://via.placeholder.com/300x300?text=Phone+Stand',
    category: 'Accessories',
    stock: 60,
  },
  {
    name: 'Cotton T-Shirt',
    description: 'Comfortable cotton T-shirt for everyday wear.',
    price: 799,
    image: 'https://via.placeholder.com/300x300?text=T-Shirt',
    category: 'Clothing',
    stock: 70,
  },
  {
    name: 'Denim Jeans',
    description: 'Classic denim jeans with a comfortable fit.',
    price: 1899,
    image: 'https://via.placeholder.com/300x300?text=Jeans',
    category: 'Clothing',
    stock: 45,
  },
  {
    name: 'Hoodie',
    description: 'Soft and warm hoodie for casual wear.',
    price: 1599,
    image: 'https://via.placeholder.com/300x300?text=Hoodie',
    category: 'Clothing',
    stock: 35,
  },
  {
    name: 'Water Bottle',
    description: 'Reusable stainless steel water bottle.',
    price: 699,
    image: 'https://via.placeholder.com/300x300?text=Water+Bottle',
    category: 'Lifestyle',
    stock: 80,
  },
  {
    name: 'Yoga Mat',
    description: 'Non-slip yoga mat suitable for workouts and yoga.',
    price: 899,
    image: 'https://via.placeholder.com/300x300?text=Yoga+Mat',
    category: 'Fitness',
    stock: 40,
  },
  {
    name: 'Dumbbell Set',
    description: 'Compact dumbbell set for home workouts.',
    price: 2499,
    image: 'https://via.placeholder.com/300x300?text=Dumbbells',
    category: 'Fitness',
    stock: 15,
  },
  {
    name: 'Desk Lamp',
    description: 'LED desk lamp with adjustable brightness.',
    price: 1099,
    image: 'https://via.placeholder.com/300x300?text=Desk+Lamp',
    category: 'Home',
    stock: 30,
  },
  {
    name: 'Coffee Mug',
    description: 'Ceramic coffee mug for home and office use.',
    price: 399,
    image: 'https://via.placeholder.com/300x300?text=Coffee+Mug',
    category: 'Home',
    stock: 100,
  },
  {
    name: 'Notebook',
    description: 'Premium ruled notebook for notes and planning.',
    price: 299,
    image: 'https://via.placeholder.com/300x300?text=Notebook',
    category: 'Stationery',
    stock: 100,
  },
  {
    name: 'Backpack',
    description: 'Everyday backpack with multiple storage compartments.',
    price: 1299,
    image: 'https://via.placeholder.com/300x300?text=Backpack',
    category: 'Bags',
    stock: 50,
  },
];

const seedProducts = async (): Promise<void> => {
  try {
    await connectDB();

    await Product.deleteMany({});

    await Product.insertMany(products);

    console.log(`${products.length} products inserted successfully`);

    process.exit(0);
  } catch (error) {
    console.error('Product seeding failed:', error);
    process.exit(1);
  }
};

seedProducts();