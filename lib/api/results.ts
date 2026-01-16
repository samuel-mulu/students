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

export const resultsApi = {
  create: async (data: CreateMarkRequest): Promise<Mark> => {
    const response = await apiClient.post<Mark>('/api/marks', data);
    return response.data;
  },

  record: async (studentId: string, subExamId: string, termId: string, data: RecordMarkRequest): Promise<Mark> => {
    const response = await apiClient.post<Mark>(
      `/api/marks/record/student/${studentId}/subexam/${subExamId}`,
      { ...data, termId }
    );
    return response.data;
  },

  recordBulk: async (subExamId: string, termId: string, marksData: Array<{ studentId: string; score: number; notes?: string }>): Promise<any> => {
    const response = await apiClient.post<any>(
      `/api/marks/record/bulk/subexam/${subExamId}`,
      { termId, marksData }
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
    const response = await apiClient.get<{ class: any; term: any; marks: Mark[] } | Mark[]>(`/api/marks/class/${classId}/term/${termId}`, { params });
    // Backend returns { class, term, marks } but we need just the marks array
    if (Array.isArray(response.data)) {
      return response.data;
    }
    // If it's an object with marks property, extract the marks array
    return (response.data as any).marks || [];
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

  getRoster: async (classId: string, termId: string): Promise<{
    class: { id: string; name: string };
    term: { id: string; name: string };
    students: Array<{
      studentId: string;
      firstName: string;
      lastName: string;
      subjects: Array<{
        subjectId: string;
        subjectName: string;
        subjectCode: string;
        termTotal: number;
        grade: string;
      }>;
    }>;
  }> => {
    const response = await apiClient.get<{
      class: { id: string; name: string };
      term: { id: string; name: string };
      students: Array<{
        studentId: string;
        firstName: string;
        lastName: string;
        subjects: Array<{
          subjectId: string;
          subjectName: string;
          subjectCode: string;
          termTotal: number;
          grade: string;
        }>;
      }>;
    }>(`/api/results/roster/class/${classId}/term/${termId}`);
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
