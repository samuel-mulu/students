import apiClient from './client';
import {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
  AssignClassRequest,
  TransferClassRequest,
  PaginationParams
} from '@/lib/types';

// Backend returns { students: Student[], pagination: {...} }
interface StudentsBackendResponse {
  students: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const studentsApi = {
  getAll: async (params?: PaginationParams & {
    classStatus?: 'new' | 'assigned';
    paymentStatus?: 'pending' | 'confirmed';
    classId?: string;
  }): Promise<StudentsBackendResponse> => {
    const response = await apiClient.get<StudentsBackendResponse>('/api/students', { params });
    // Response interceptor extracts data, backend returns { students, pagination }
    return response.data;
  },

  getById: async (id: string): Promise<Student> => {
    const response = await apiClient.get<Student>(`/api/students/${id}`);
    return response.data;
  },

  create: async (data: CreateStudentRequest): Promise<Student> => {
    const response = await apiClient.post<Student>('/api/students', data);
    return response.data;
  },

  update: async (id: string, data: UpdateStudentRequest): Promise<Student> => {
    const response = await apiClient.patch<Student>(`/api/students/${id}`, data);
    return response.data;
  },

  assignClass: async (id: string, data: AssignClassRequest): Promise<Student> => {
    const response = await apiClient.post<Student>(`/api/students/${id}/assign-class`, data);
    return response.data;
  },

  transfer: async (id: string, data: TransferClassRequest): Promise<Student> => {
    const response = await apiClient.post<Student>(`/api/students/${id}/transfer`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/students/${id}`);
  },
};


