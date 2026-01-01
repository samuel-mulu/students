import apiClient from './client';
import {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
  AssignClassRequest,
  TransferClassRequest,
  PaginationParams,
  ApiResponse,
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
    const response = await apiClient.get<ApiResponse<StudentsBackendResponse>>('/api/students', { params });
    // Response interceptor extracts data, backend returns { students, pagination }
    return response.data as StudentsBackendResponse;
  },

  getById: async (id: string): Promise<Student> => {
    const response = await apiClient.get<ApiResponse<Student>>(`/api/students/${id}`);
    return response.data as Student;
  },

  create: async (data: CreateStudentRequest): Promise<Student> => {
    const response = await apiClient.post<ApiResponse<Student>>('/api/students', data);
    return response.data as Student;
  },

  update: async (id: string, data: UpdateStudentRequest): Promise<Student> => {
    const response = await apiClient.patch<ApiResponse<Student>>(`/api/students/${id}`, data);
    return response.data as Student;
  },

  assignClass: async (id: string, data: AssignClassRequest): Promise<Student> => {
    const response = await apiClient.post<ApiResponse<Student>>(`/api/students/${id}/assign-class`, data);
    return response.data as Student;
  },

  transfer: async (id: string, data: TransferClassRequest): Promise<Student> => {
    const response = await apiClient.post<ApiResponse<Student>>(`/api/students/${id}/transfer`, data);
    return response.data as Student;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/students/${id}`);
  },
};

