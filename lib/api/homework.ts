import apiClient from './client';
import {
  Homework,
  CreateHomeworkRequest,
  BulkHomeworkRequest,
  UpdateHomeworkRequest,
  PaginationParams
} from '@/lib/types';

export const homeworkApi = {
  create: async (data: CreateHomeworkRequest): Promise<Homework> => {
    const response = await apiClient.post<Homework>('/api/homework', data);
    return response.data;
  },

  createBulk: async (data: BulkHomeworkRequest): Promise<Homework[]> => {
    const response = await apiClient.post<Homework[]>('/api/homework/bulk', data);
    return response.data;
  },

  getAll: async (params?: PaginationParams & {
    studentId?: string;
    classId?: string;
    subjectId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: 'done' | 'not_done';
  }): Promise<Homework[]> => {
    const response = await apiClient.get<Homework[]>('/api/homework', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Homework> => {
    const response = await apiClient.get<Homework>(`/api/homework/${id}`);
    return response.data;
  },

  getByClass: async (classId: string, date: string, subjectId?: string): Promise<any> => {
    const response = await apiClient.get<any>(`/api/homework/class/${classId}`, {
      params: { date, subjectId },
    });
    // Backend returns { class, date, students: [{ student, homework }] }
    return response.data;
  },

  getClassDates: async (classId: string): Promise<string[]> => {
    const response = await apiClient.get<string[]>(`/api/homework/class/${classId}/dates`);
    return response.data;
  },

  getClassSummary: async (classId: string): Promise<Array<{
    date: string;
    done: number;
    not_done: number;
    total: number;
  }>> => {
    const response = await apiClient.get<Array<{
      date: string;
      done: number;
      not_done: number;
      total: number;
    }>>(`/api/homework/class/${classId}/summary`);
    return response.data;
  },

  update: async (id: string, data: UpdateHomeworkRequest): Promise<Homework> => {
    const response = await apiClient.patch<Homework>(`/api/homework/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/homework/${id}`);
  },
};
