import apiClient from './client';
import { SubExam, CreateSubExamRequest, UpdateSubExamRequest, ApiResponse } from '@/lib/types';

export const subexamsApi = {
  create: async (data: CreateSubExamRequest): Promise<SubExam> => {
    const response = await apiClient.post<ApiResponse<SubExam>>('/api/subexams', data);
    return response.data as SubExam;
  },

  getBySubjectAndTerm: async (subjectId: string, termId: string): Promise<SubExam[]> => {
    const response = await apiClient.get<ApiResponse<SubExam[]>>(
      `/api/subexams/subject/${subjectId}/term/${termId}`
    );
    return response.data as SubExam[];
  },

  update: async (id: string, data: UpdateSubExamRequest): Promise<SubExam> => {
    const response = await apiClient.patch<ApiResponse<SubExam>>(`/api/subexams/${id}`, data);
    return response.data as SubExam;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/subexams/${id}`);
  },
};

