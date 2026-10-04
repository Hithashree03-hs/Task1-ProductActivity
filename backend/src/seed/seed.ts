import dotenv from 'dotenv';
import connectDB from '../config/db';
import Product from '../models/Product';

dotenv.config();

const products = [
  {
  name: 'Wireless Headphones',
  description: 'Comfortable wireless headphones with clear sound.',
  price: 2499,
  image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
  category: 'Electronics',
  stock: 25,
},
{
  name: 'Smart Watch',
  description: 'Smart watch with fitness and notification features.',
  price: 3999,
  image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
  category: 'Electronics',
  stock: 20,
},
{
  name: 'Running Shoes',
  description: 'Lightweight running shoes for everyday workouts.',
  price: 2999,
  image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
  category: 'Footwear',
  stock: 30,
},
{
  name: 'Laptop Backpack',
  description: 'Durable backpack with a dedicated laptop compartment.',
  price: 1499,
  image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600',
  category: 'Bags',
  stock: 40,
},
{
  name: 'Bluetooth Speaker',
  description: 'Portable Bluetooth speaker with powerful audio.',
  price: 1799,
  image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600',
  category: 'Electronics',
  stock: 35,
},
  {
  name: 'Mechanical Keyboard',
  description: 'Mechanical keyboard designed for productivity and gaming.',
  price: 3499,
  image: 'https://images.unsplash.com/photo-1734126048491-a98cd0bef202?w=600',
  category: 'Electronics',
  stock: 18,
},
{
  name: 'Wireless Mouse',
  description: 'Ergonomic wireless mouse with precise tracking.',
  price: 999,
  image: 'https://images.unsplash.com/photo-1707592691247-5c3a1c7ba0e3?w=600',
  category: 'Electronics',
  stock: 50,
},
{
  name: 'USB-C Hub',
  description: 'Multi-port USB-C hub for laptops and tablets.',
  price: 1299,
  image: 'https://images.unsplash.com/photo-1760376789478-c1023d2dc007?w=600',
  category: 'Accessories',
  stock: 45,
},
{
  name: 'Power Bank',
  description: 'High-capacity portable power bank.',
  price: 1599,
  image: 'https://images.unsplash.com/photo-1564286026507-03875c383229?auto=format&fit=crop&w=600&q=80',
  category: 'Electronics',
  stock: 28,
},
{
  name: 'Phone Stand',
  description: 'Adjustable stand for smartphones and tablets.',
  price: 599,
 image: 'https://images.unsplash.com/photo-1760462788374-fe0d2d4ba4d1?w=600',
  category: 'Accessories',
  stock: 60,
},
  
{
    name: 'Cotton T-Shirt',
    description: 'Comfortable cotton T-shirt for everyday wear.',
    price: 799,
    image:'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
    category: 'Clothing',
    stock: 70,
  },
  {
    name: 'Denim Jeans',
    description: 'Classic denim jeans with a comfortable fit.',
    price: 1899,
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600',
    category: 'Clothing',
    stock: 45,
  },
  {
    name: 'Hoodie',
    description: 'Soft and warm hoodie for casual wear.',
    price: 1599,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600',
    category: 'Clothing',
    stock: 35,
  },
  {
    name: 'Water Bottle',
    description: 'Reusable stainless steel water bottle.',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600',
    category: 'Lifestyle',
    price: 699,
    
    stock: 80,
  },
  {
    name: 'Yoga Mat',
    description: 'Non-slip yoga mat suitable for workouts and yoga.',
    price: 899,
   image: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=600',
    category: 'Fitness',
    stock: 40,
  },
  {
    name: 'Dumbbell Set',
    description: 'Compact dumbbell set for home workouts.',
    price: 2499,
    image: 'https://images.unsplash.com/photo-1689446802635-6c61ad0cc1d0?w=600',
    category: 'Fitness',
    stock: 15,
  },
  {
    name: 'Desk Lamp',
    description: 'LED desk lamp with adjustable brightness.',
    price: 1099,
   image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600',
    category: 'Home',
    stock: 30,
  },
  {
    name: 'Coffee Mug',
    description: 'Ceramic coffee mug for home and office use.',
    price: 399,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600',
    category: 'Home',
    stock: 100,
  },
  {
    name: 'Notebook',
    description: 'Premium ruled notebook for notes and planning.',
    price: 299,
    image: 'https://images.unsplash.com/photo-1764044371485-b83d1e023d8b?w=600',
    category: 'Stationery',
    stock: 100,
  },
  {
    name: 'Backpack',
    description: 'Everyday backpack with multiple storage compartments.',
    price: 1299,
  image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600',
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