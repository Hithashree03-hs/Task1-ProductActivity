import apiClient from '../api/client';
import { Product } from './productService';

export const getRecommendations = async (token: string | null): Promise<Product[]> => {
  const response = await apiClient.get<{ products: Product[] }>('/recommendations', token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  return response.data.products;
};
