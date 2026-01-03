import apiClient from './client';
import {
  AcademicYear,
  CreateAcademicYearRequest,
  UpdateAcademicYearRequest,
  ApiResponse,
} from '@/lib/types';

export const academicYearsApi = {
  getAll: async (): Promise<AcademicYear[]> => {
    const response = await apiClient.get<ApiResponse<AcademicYear[]>>('/api/academic-years');
    return response.data as AcademicYear[];
  },

  getActive: async (): Promise<AcademicYear | null> => {
    const response = await apiClient.get<ApiResponse<AcademicYear | null>>('/api/academic-years/active');
    return response.data as AcademicYear | null;
  },

  getById: async (id: string): Promise<AcademicYear> => {
    const response = await apiClient.get<ApiResponse<AcademicYear>>(`/api/academic-years/${id}`);
    return response.data as AcademicYear;
  },

  create: async (data: CreateAcademicYearRequest): Promise<AcademicYear> => {
    const response = await apiClient.post<ApiResponse<AcademicYear>>('/api/academic-years', data);
    return response.data as AcademicYear;
  },

  update: async (id: string, data: UpdateAcademicYearRequest): Promise<AcademicYear> => {
    const response = await apiClient.patch<ApiResponse<AcademicYear>>(`/api/academic-years/${id}`, data);
    return response.data as AcademicYear;
  },

  activate: async (id: string): Promise<AcademicYear> => {
    const response = await apiClient.post<ApiResponse<AcademicYear>>(`/api/academic-years/${id}/activate`);
    return response.data as AcademicYear;
  },

  close: async (id: string): Promise<AcademicYear> => {
    const response = await apiClient.post<ApiResponse<AcademicYear>>(`/api/academic-years/${id}/close`);
    return response.data as AcademicYear;
  },
};

