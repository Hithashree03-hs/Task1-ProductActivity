import apiClient from '../api/client';

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
}

export interface ProductResponse {
  products: Product[];
}

export const getProducts = async (): Promise<Product[]> => {
  const response = await apiClient.get<ProductResponse>(
    '/products'
  );

  return response.data.products;
};

export const getProductById = async (
  productId: string
): Promise<Product> => {
  const response = await apiClient.get<{ product: Product }>(
    `/products/${productId}`
  );

  return response.data.product;
};