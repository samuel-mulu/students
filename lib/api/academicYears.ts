import apiClient from './client';
import {
  AcademicYear,
  CreateAcademicYearRequest,
  UpdateAcademicYearRequest,
} from '@/lib/types';

export const academicYearsApi = {
  getAll: async (): Promise<AcademicYear[]> => {
    const response = await apiClient.get<AcademicYear[]>('/api/academic-years');
    return response.data;
  },

  getActive: async (): Promise<AcademicYear | null> => {
    const response = await apiClient.get<AcademicYear | null>('/api/academic-years/active');
    return response.data;
  },

  getById: async (id: string): Promise<AcademicYear> => {
    const response = await apiClient.get<AcademicYear>(`/api/academic-years/${id}`);
    return response.data;
  },

  create: async (data: CreateAcademicYearRequest): Promise<AcademicYear> => {
    const response = await apiClient.post<AcademicYear>('/api/academic-years', data);
    return response.data;
  },

  update: async (id: string, data: UpdateAcademicYearRequest): Promise<AcademicYear> => {
    const response = await apiClient.patch<AcademicYear>(`/api/academic-years/${id}`, data);
    return response.data;
  },

  activate: async (id: string): Promise<AcademicYear> => {
    const response = await apiClient.post<AcademicYear>(`/api/academic-years/${id}/activate`);
    return response.data;
  },

  close: async (id: string): Promise<AcademicYear> => {
    const response = await apiClient.post<AcademicYear>(`/api/academic-years/${id}/close`);
    return response.data;
  },
};


