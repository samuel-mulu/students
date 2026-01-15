import apiClient from './client';
import {
  Grade,
  CreateGradeRequest,
  UpdateGradeRequest,
  Subject,
  CreateSubjectRequest
} from '@/lib/types';

export const gradesApi = {
  getAll: async (): Promise<Grade[]> => {
    const response = await apiClient.get<Grade[]>('/api/grades');
    return response.data;
  },

  getById: async (id: string): Promise<Grade> => {
    const response = await apiClient.get<Grade>(`/api/grades/${id}`);
    return response.data;
  },

  create: async (data: CreateGradeRequest): Promise<Grade> => {
    const response = await apiClient.post<Grade>('/api/grades', data);
    return response.data;
  },

  update: async (id: string, data: UpdateGradeRequest): Promise<Grade> => {
    const response = await apiClient.patch<Grade>(`/api/grades/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/grades/${id}`);
  },

  // Grade-level subject endpoints
  getSubjects: async (gradeId: string): Promise<Subject[]> => {
    const response = await apiClient.get<Subject[]>(`/api/grades/${gradeId}/subjects`);
    return response.data;
  },

  createSubject: async (gradeId: string, data: CreateSubjectRequest): Promise<Subject> => {
    const response = await apiClient.post<Subject>(`/api/grades/${gradeId}/subjects`, data);
    return response.data;
  },
};


