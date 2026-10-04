import apiClient from '../api/client';

export const addToWishlist = async (
  token: string,
  productId: string
): Promise<void> => {
  await apiClient.post(
    '/wishlist/add',
    
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

export const removeFromWishlist = async (
  token: string,
  productId: string
): Promise<void> => {
  await apiClient.delete(
    '/wishlist/remove',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        productId,
      },
    }
  );
};

export const getWishlist = async (
  token: string
): Promise<any[]> => {
  const response = await apiClient.get(
    '/wishlist',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data.products;
};