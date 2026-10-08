import apiClient from '../api/client';

export const registerExpoPushToken = async (token: string, expoPushToken: string): Promise<void> => {
  await apiClient.post('/notifications/devices', { token: expoPushToken }, { headers: { Authorization: `Bearer ${token}` } });
};
export const getNotificationHistory = async (token: string, page = 1) => {
  const response = await apiClient.get('/notifications', { params: { page }, headers: { Authorization: `Bearer ${token}` } });
  return response.data;
};
