import apiClient from '../api/client';

export interface CartProduct {
  _id: string;
  name: string;
  price: number;
  image: string;
  category?: string;
}

export interface CartItem {
  _id?: string;
  productId: CartProduct | null;
  quantity: number;
}

export interface CartData {
  items: CartItem[];
}

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

export const getCart = async (
  token: string
): Promise<CartData> => {
  const response =
    await apiClient.get('/cart', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

  return response.data.cart;
};

export const updateCartQuantity = async (
  token: string,
  productId: string,
  quantity: number
): Promise<void> => {
  await apiClient.patch(
    `/cart/${productId}`,
    {
      quantity,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};