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
  savedForLater?: boolean;
  size?: string;
  color?: string;
}

export interface CartData {
  items: CartItem[];
}

export interface CartValidationIssue {
  itemId: string;
  productId: string;
  productName: string;
  type: 'unavailable' | 'stock' | 'price';
  availableStock?: number;
  quantity?: number;
  oldPrice?: number;
  newPrice?: number;
}

export interface CartValidationResult {
  valid: boolean;
  issues: CartValidationIssue[];
  cart: CartData;
}

export const validateCart = async (
  token: string
): Promise<CartValidationResult> => {
  const response = await apiClient.post<CartValidationResult>(
    '/cart/validate',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

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
