import apiClient from '../api/client';

export interface OrderItemRequest {
  productId: string;
  quantity: number;
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