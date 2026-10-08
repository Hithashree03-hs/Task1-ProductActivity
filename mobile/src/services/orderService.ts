import apiClient from '../api/client';

export interface OrderItemRequest {
  productId: string;
  quantity: number;
  price?: number;
}

export interface CreateOrderResponse {
  message: string;
  order: {
    _id: string;
    totalAmount: number;
    status: string;
  };
}

export const createOrder = async (
  token: string,
  items: OrderItemRequest[]
): Promise<CreateOrderResponse> => {
  const response =
    await apiClient.post<CreateOrderResponse>(
      '/orders',
      {
        items,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

  return response.data;
};

export const getOrders = async (token: string, page = 1, filters: { status?: string; sort?: string } = {}) => {
  const response = await apiClient.get('/orders', { params: { page, limit: 10, ...filters }, headers: { Authorization: `Bearer ${token}` } });
  return response.data as { orders: Array<{_id: string; totalAmount: number; status: string; createdAt: string; items: Array<{productId: {name: string} | null; quantity: number; price: number}>}>; page: number; pages: number; total: number };
};
