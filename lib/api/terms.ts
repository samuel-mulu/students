import apiClient from './client';
import { Term, CreateTermRequest, ApiResponse } from '@/lib/types';

export const termsApi = {
  getAll: async (): Promise<Term[]> => {
    const response = await apiClient.get<Term[]>('/api/terms');
    return response.data;
  },

  getById: async (id: string): Promise<Term> => {
    const response = await apiClient.get<Term>(`/api/terms/${id}`);
    return response.data;
  },

  create: async (data: CreateTermRequest): Promise<Term> => {
    const response = await apiClient.post<Term>('/api/terms', data);
    return response.data;
  },

  // Get terms by academic year
  getByAcademicYear: async (academicYearId: string): Promise<Term[]> => {
    const response = await apiClient.get<Term[]>('/api/terms', {
      params: { academicYearId },
    });
    return response.data;
  },
};


