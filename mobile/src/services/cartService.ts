import apiClient from '../api/client';

export const addToCart = async (
  token: string,
  productId: string
): Promise<void> => {
  await apiClient.post(
    '/cart/add',
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