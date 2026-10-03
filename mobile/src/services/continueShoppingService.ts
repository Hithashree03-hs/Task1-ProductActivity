import apiClient from '../api/client';
import { Product } from './productService';

export interface ContinueShoppingItem {
  product: Product;
  viewedAt: string;
}

export const getContinueShopping = async (
  token: string
): Promise<ContinueShoppingItem[]> => {
  const response = await apiClient.get<{
    products: ContinueShoppingItem[];
  }>('/continue-shopping', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data.products;
};
