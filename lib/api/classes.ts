import apiClient from './client';
import {
  Class,
  CreateClassRequest,
  UpdateClassRequest,
  Subject,
  CreateSubjectRequest,
  UpdateSubjectRequest
} from '@/lib/types';

// Backend returns { classes: Class[], pagination: {...} }
interface ClassesBackendResponse {
  classes: Class[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const classesApi = {
  getAll: async (): Promise<Class[]> => {
    const response = await apiClient.get<ClassesBackendResponse>('/api/classes');
    // Response interceptor extracts data, backend returns { classes, pagination }
    const result = response.data;
    return result.classes || [];
  },

  getById: async (id: string): Promise<Class> => {
    const response = await apiClient.get<Class>(`/api/classes/${id}`);
    return response.data;
  },

  create: async (data: CreateClassRequest): Promise<Class> => {
    const response = await apiClient.post<Class>('/api/classes', data);
    return response.data;
  },

  update: async (id: string, data: UpdateClassRequest): Promise<Class> => {
    const response = await apiClient.patch<Class>(`/api/classes/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/classes/${id}`);
  },

  // Subject endpoints
  getSubjects: async (classId: string): Promise<Subject[]> => {
    const response = await apiClient.get<Subject[]>(`/api/classes/${classId}/subjects`);
    return response.data;
  },

  createSubject: async (classId: string, data: CreateSubjectRequest): Promise<Subject> => {
    const response = await apiClient.post<Subject>(`/api/classes/${classId}/subjects`, data);
    return response.data;
  },

  updateSubject: async (subjectId: string, data: UpdateSubjectRequest): Promise<Subject> => {
    const response = await apiClient.patch<Subject>(`/api/classes/subjects/${subjectId}`, data);
    return response.data;
  },

  deleteSubject: async (subjectId: string): Promise<void> => {
    await apiClient.delete(`/api/classes/subjects/${subjectId}`);
  },

  // Get classes by grade
  getByGrade: async (gradeId: string): Promise<Class[]> => {
    const response = await apiClient.get<ClassesBackendResponse>('/api/classes', {
      params: { gradeId },
    });
    const result = response.data;
    return result.classes || [];
  },

  // Get classes by grade and academic year
  getByGradeAndYear: async (gradeId: string, academicYearId: string): Promise<Class[]> => {
    const response = await apiClient.get<ClassesBackendResponse>('/api/classes', {
      params: { gradeId, academicYearId },
    });
    const result = response.data;
    return result.classes || [];
  },
};


