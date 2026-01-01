import apiClient from './client';
import {
  Class,
  CreateClassRequest,
  UpdateClassRequest,
  Subject,
  CreateSubjectRequest,
  UpdateSubjectRequest,
  ApiResponse,
} from '@/lib/types';

export const classesApi = {
  getAll: async (): Promise<Class[]> => {
    const response = await apiClient.get<ApiResponse<Class[]>>('/api/classes');
    return response.data as Class[];
  },

  getById: async (id: string): Promise<Class> => {
    const response = await apiClient.get<ApiResponse<Class>>(`/api/classes/${id}`);
    return response.data as Class;
  },

  create: async (data: CreateClassRequest): Promise<Class> => {
    const response = await apiClient.post<ApiResponse<Class>>('/api/classes', data);
    return response.data as Class;
  },

  update: async (id: string, data: UpdateClassRequest): Promise<Class> => {
    const response = await apiClient.patch<ApiResponse<Class>>(`/api/classes/${id}`, data);
    return response.data as Class;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/classes/${id}`);
  },

  // Subject endpoints
  getSubjects: async (classId: string): Promise<Subject[]> => {
    const response = await apiClient.get<ApiResponse<Subject[]>>(`/api/classes/${classId}/subjects`);
    return response.data as Subject[];
  },

  createSubject: async (classId: string, data: CreateSubjectRequest): Promise<Subject> => {
    const response = await apiClient.post<ApiResponse<Subject>>(`/api/classes/${classId}/subjects`, data);
    return response.data as Subject;
  },

  updateSubject: async (subjectId: string, data: UpdateSubjectRequest): Promise<Subject> => {
    const response = await apiClient.patch<ApiResponse<Subject>>(`/api/classes/subjects/${subjectId}`, data);
    return response.data as Subject;
  },

  deleteSubject: async (subjectId: string): Promise<void> => {
    await apiClient.delete(`/api/classes/subjects/${subjectId}`);
  },
};

