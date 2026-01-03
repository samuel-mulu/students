import apiClient from './client';
import { Term, CreateTermRequest, ApiResponse } from '@/lib/types';

export const termsApi = {
  getAll: async (): Promise<Term[]> => {
    const response = await apiClient.get<ApiResponse<Term[]>>('/api/terms');
    return response.data as Term[];
  },

  getById: async (id: string): Promise<Term> => {
    const response = await apiClient.get<ApiResponse<Term>>(`/api/terms/${id}`);
    return response.data as Term;
  },

  create: async (data: CreateTermRequest): Promise<Term> => {
    const response = await apiClient.post<ApiResponse<Term>>('/api/terms', data);
    return response.data as Term;
  },

  // Get terms by academic year
  getByAcademicYear: async (academicYearId: string): Promise<Term[]> => {
    const response = await apiClient.get<ApiResponse<Term[]>>('/api/terms', {
      params: { academicYearId },
    });
    return response.data as Term[];
  },
};

