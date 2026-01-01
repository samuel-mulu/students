import apiClient from './client';
import { LoginRequest, RegisterRequest, User } from '@/lib/types';
import { ApiResponse } from '@/lib/types';

// Backend returns { success: true, data: { user, token }, message: "..." }
interface LoginResponse {
  user: User;
  token?: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/api/auth/login', data);
    // Response interceptor already extracts data, but login returns { user, token }
    return response.data as LoginResponse;
  },

  register: async (data: RegisterRequest): Promise<{ user: User }> => {
    const response = await apiClient.post<ApiResponse<{ user: User }>>('/api/auth/register', data);
    return response.data as { user: User };
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/auth/logout');
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await apiClient.get<ApiResponse<User>>('/api/auth/me');
    // Backend returns user directly in data field
    return { user: response.data as User };
  },
};

