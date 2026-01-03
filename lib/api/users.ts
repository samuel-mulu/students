import apiClient from './client';
import { User, PaginatedResponse } from '@/lib/types';

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
    const response = await apiClient.get<User[]>('/api/users', {
      params: role ? { role } : undefined,
    });
    return response.data || [];
  },

  getTeachers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/api/users/teachers');
    return response.data || [];
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(`/api/users/${id}`);
    return response.data;
  },

  create: async (data: CreateUserRequest): Promise<User> => {
    const response = await apiClient.post<User>('/api/users', data);
    return response.data;
  },

  update: async (id: string, data: UpdateUserRequest): Promise<User> => {
    const response = await apiClient.patch<User>(`/api/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/users/${id}`);
  },
};



