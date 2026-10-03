import apiClient from '../api/client';
import { Product } from './productService';

export interface RecentlyViewedItem {
  product: Product;
  viewedAt: string;
}

export const recordProductView = async (
  token: string,
  productId: string
): Promise<void> => {
  await apiClient.post(
    '/recently-viewed/view',
    {
      productId,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const getRecentlyViewed = async (
  token: string
): Promise<RecentlyViewedItem[]> => {
  const response = await apiClient.get<{
    products: RecentlyViewedItem[];
  }>('/recently-viewed', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data.products;
};

export const mergeRecentlyViewed = async (
  token: string,
  localHistory: Array<{
    productId: string;
    viewedAt: string;
  }>
): Promise<RecentlyViewedItem[]> => {
  const response = await apiClient.post<{
    products: RecentlyViewedItem[];
  }>(
    '/recently-viewed/merge',
    {
      localHistory,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data.products;
};