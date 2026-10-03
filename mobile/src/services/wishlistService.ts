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