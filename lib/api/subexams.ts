import apiClient from './client';
import { SubExam, CreateSubExamRequest, UpdateSubExamRequest, ApiResponse } from '@/lib/types';

export const subexamsApi = {
  create: async (data: CreateSubExamRequest): Promise<SubExam> => {
    const response = await apiClient.post<SubExam>('/api/subexams', data);
    return response.data;
  },

  getBySubject: async (gradeId: string, subjectId: string): Promise<SubExam[]> => {
    const response = await apiClient.get<SubExam[]>(
      `/api/subexams/grade/${gradeId}/subject/${subjectId}`
    );
    return response.data;
  },

  update: async (id: string, data: UpdateSubExamRequest): Promise<SubExam> => {
    const response = await apiClient.patch<SubExam>(`/api/subexams/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/subexams/${id}`);
  },
};


