import apiClient from './client';
import {
  Mark,
  CreateMarkRequest,
  RecordMarkRequest,
  UpdateMarkRequest,
  TermScoreCalculation,
  YearScoreCalculation,
  RosterEntry,
  PaginationParams,
  ApiResponse,
} from '@/lib/types';

export const marksApi = {
  create: async (data: CreateMarkRequest): Promise<Mark> => {
    const response = await apiClient.post<ApiResponse<Mark>>('/api/marks', data);
    return response.data as Mark;
  },

  record: async (studentId: string, subExamId: string, data: RecordMarkRequest): Promise<Mark> => {
    const response = await apiClient.post<ApiResponse<Mark>>(
      `/api/marks/record/student/${studentId}/subexam/${subExamId}`,
      data
    );
    return response.data as Mark;
  },

  getAll: async (params?: PaginationParams & {
    studentId?: string;
    classId?: string;
    subjectId?: string;
    termId?: string;
    subExamId?: string;
  }): Promise<Mark[]> => {
    const response = await apiClient.get<ApiResponse<Mark[]>>('/api/marks', { params });
    return response.data as Mark[];
  },

  getById: async (id: string): Promise<Mark> => {
    const response = await apiClient.get<ApiResponse<Mark>>(`/api/marks/${id}`);
    return response.data as Mark;
  },

  getByTermAndStudent: async (termId: string, studentId: string): Promise<Mark[]> => {
    const response = await apiClient.get<ApiResponse<Mark[]>>(`/api/marks/term/${termId}/student/${studentId}`);
    return response.data as Mark[];
  },

  getByClassAndTerm: async (classId: string, termId: string): Promise<Mark[]> => {
    const response = await apiClient.get<ApiResponse<Mark[]>>(`/api/marks/class/${classId}/term/${termId}`);
    return response.data as Mark[];
  },

  calculateTermScore: async (
    termId: string,
    studentId: string,
    subjectId: string
  ): Promise<TermScoreCalculation> => {
    const response = await apiClient.get<ApiResponse<TermScoreCalculation>>(
      `/api/marks/calculate/term/${termId}/student/${studentId}/subject/${subjectId}`
    );
    return response.data as TermScoreCalculation;
  },

  calculateYearScore: async (studentId: string, subjectId: string): Promise<YearScoreCalculation> => {
    const response = await apiClient.get<ApiResponse<YearScoreCalculation>>(
      `/api/marks/calculate/year/student/${studentId}/subject/${subjectId}`
    );
    return response.data as YearScoreCalculation;
  },

  getTermReport: async (termId: string, studentId: string): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>(`/api/marks/report/term/${termId}/student/${studentId}`);
    return response.data;
  },

  getRoster: async (classId: string, termId?: string): Promise<RosterEntry[]> => {
    const response = await apiClient.get<ApiResponse<RosterEntry[]>>(`/api/marks/roster/class/${classId}`, {
      params: termId ? { termId } : {},
    });
    return response.data as RosterEntry[];
  },

  update: async (id: string, data: UpdateMarkRequest): Promise<Mark> => {
    const response = await apiClient.patch<ApiResponse<Mark>>(`/api/marks/${id}`, data);
    return response.data as Mark;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/marks/${id}`);
  },
};

