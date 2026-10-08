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

export interface OrderFilters { status?: string; paymentMethod?: string; from?: string; to?: string; sort?: string; }
export interface OrderSummary { _id: string; totalAmount: number; status: string; paymentStatus: string; paymentMethod: string; invoiceNumber?: string; createdAt: string; deliveryTimeline?: Array<{status: string; note: string; at: string}>; items: Array<{productId: {name: string; image: string; category: string} | null; quantity: number; price: number; size?: string; color?: string}>; }
export const getOrders = async (token: string, page = 1, filters: OrderFilters = {}) => {
  const response = await apiClient.get('/orders', { params: { page, limit: 10, ...filters }, headers: { Authorization: `Bearer ${token}` } });
  return response.data as { orders: OrderSummary[]; page: number; pages: number; total: number };
};

export const orderAction = async (token: string, orderId: string, action: 'cancel' | 'return', reason = '') => (await apiClient.post(`/orders/${orderId}/actions`, { action, reason }, { headers: { Authorization: `Bearer ${token}` } })).data;
export const reorder = async (token: string, orderId: string) => (await apiClient.post(`/orders/${orderId}/reorder`, {}, { headers: { Authorization: `Bearer ${token}` } })).data;
export const invoiceUrl = (orderId: string) => `${apiClient.defaults.baseURL}/orders/${orderId}/invoice`;
