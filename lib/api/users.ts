import apiClient from './client';
import { User, ApiResponse, PaginatedResponse } from '@/lib/types';

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: 'REGISTRAR' | 'TEACHER';
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
}

export const usersApi = {
  getAll: async (role?: string): Promise<User[]> => {
    const response = await apiClient.get<ApiResponse<User[]>>('/api/users', {
      params: role ? { role } : undefined,
    });
    return response.data || [];
  },

  getTeachers: async (): Promise<User[]> => {
    const response = await apiClient.get<ApiResponse<User[]>>('/api/users/teachers');
    return response.data || [];
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(`/api/users/${id}`);
    return response.data as User;
  },

  create: async (data: CreateUserRequest): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>('/api/users', data);
    return response.data as User;
  },

  update: async (id: string, data: UpdateUserRequest): Promise<User> => {
    const response = await apiClient.patch<ApiResponse<User>>(`/api/users/${id}`, data);
    return response.data as User;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/users/${id}`);
  },
};

