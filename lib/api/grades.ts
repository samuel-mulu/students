import apiClient from './client';
import {
  Grade,
  CreateGradeRequest,
  UpdateGradeRequest,
  ApiResponse,
} from '@/lib/types';

export const gradesApi = {
  getAll: async (): Promise<Grade[]> => {
    const response = await apiClient.get<ApiResponse<Grade[]>>('/api/grades');
    return response.data as Grade[];
  },

  getById: async (id: string): Promise<Grade> => {
    const response = await apiClient.get<ApiResponse<Grade>>(`/api/grades/${id}`);
    return response.data as Grade;
  },

  create: async (data: CreateGradeRequest): Promise<Grade> => {
    const response = await apiClient.post<ApiResponse<Grade>>('/api/grades', data);
    return response.data as Grade;
  },

  update: async (id: string, data: UpdateGradeRequest): Promise<Grade> => {
    const response = await apiClient.patch<ApiResponse<Grade>>(`/api/grades/${id}`, data);
    return response.data as Grade;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/grades/${id}`);
  },
};

