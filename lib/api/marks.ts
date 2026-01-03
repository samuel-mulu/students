import apiClient from './client';
import {
  Mark,
  CreateMarkRequest,
  RecordMarkRequest,
  UpdateMarkRequest,
  TermScoreCalculation,
  YearScoreCalculation,
  RosterEntry,
  PaginationParams
} from '@/lib/types';

export const marksApi = {
  create: async (data: CreateMarkRequest): Promise<Mark> => {
    const response = await apiClient.post<Mark>('/api/marks', data);
    return response.data;
  },

  record: async (studentId: string, subExamId: string, data: RecordMarkRequest): Promise<Mark> => {
    const response = await apiClient.post<Mark>(
      `/api/marks/record/student/${studentId}/subexam/${subExamId}`,
      data
    );
    return response.data;
  },

  recordBulk: async (subExamId: string, marksData: Array<{ studentId: string; score: number; notes?: string }>): Promise<any> => {
    const response = await apiClient.post<any>(
      `/api/marks/record/bulk/subexam/${subExamId}`,
      { marksData }
    );
    return response.data;
  },

  getAll: async (params?: PaginationParams & {
    studentId?: string;
    classId?: string;
    subjectId?: string;
    termId?: string;
    subExamId?: string;
  }): Promise<Mark[]> => {
    const response = await apiClient.get<Mark[]>('/api/marks', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Mark> => {
    const response = await apiClient.get<Mark>(`/api/marks/${id}`);
    return response.data;
  },

  getByTermAndStudent: async (termId: string, studentId: string): Promise<Mark[]> => {
    const response = await apiClient.get<Mark[]>(`/api/marks/term/${termId}/student/${studentId}`);
    return response.data;
  },

  getByClassAndTerm: async (classId: string, termId: string, subjectId?: string): Promise<Mark[]> => {
    const params = subjectId ? { subjectId } : {};
    const response = await apiClient.get<Mark[]>(`/api/marks/class/${classId}/term/${termId}`, { params });
    return response.data;
  },

  calculateTermScore: async (
    termId: string,
    studentId: string,
    subjectId: string
  ): Promise<TermScoreCalculation> => {
    const response = await apiClient.get<TermScoreCalculation>(
      `/api/marks/calculate/term/${termId}/student/${studentId}/subject/${subjectId}`
    );
    return response.data;
  },

  calculateYearScore: async (studentId: string, subjectId: string): Promise<YearScoreCalculation> => {
    const response = await apiClient.get<YearScoreCalculation>(
      `/api/marks/calculate/year/student/${studentId}/subject/${subjectId}`
    );
    return response.data;
  },

  getTermReport: async (termId: string, studentId: string): Promise<any> => {
    const response = await apiClient.get<any>(`/api/marks/report/term/${termId}/student/${studentId}`);
    return response.data;
  },

  getRoster: async (classId: string, termId?: string): Promise<RosterEntry[]> => {
    const response = await apiClient.get<RosterEntry[]>(`/api/marks/roster/class/${classId}`, {
      params: termId ? { termId } : {},
    });
    return response.data;
  },

  update: async (id: string, data: UpdateMarkRequest): Promise<Mark> => {
    const response = await apiClient.patch<Mark>(`/api/marks/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/marks/${id}`);
  },
};


