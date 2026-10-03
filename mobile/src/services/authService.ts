import apiClient from '../api/client';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export const registerUser = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>(
    '/auth/register',
    {
      name,
      email,
      password,
    }
  );

  return response.data;
};

export const loginUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>(
    '/auth/login',
    {
      email,
      password,
    }
  );

  return response.data;
};

export const getCurrentUser = async (
  token: string
): Promise<{ user: User }> => {
  const response = await apiClient.get<{ user: User }>(
    '/auth/me',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};