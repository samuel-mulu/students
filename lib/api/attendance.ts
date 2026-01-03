import apiClient from './client';
import {
  Attendance,
  CreateAttendanceRequest,
  BulkAttendanceRequest,
  UpdateAttendanceRequest,
  ApiResponse,
} from '@/lib/types';

export const attendanceApi = {
  create: async (data: CreateAttendanceRequest): Promise<Attendance> => {
    const response = await apiClient.post<ApiResponse<Attendance>>('/api/attendance', data);
    return response.data as Attendance;
  },

  createBulk: async (data: BulkAttendanceRequest): Promise<Attendance[]> => {
    const response = await apiClient.post<ApiResponse<Attendance[]>>('/api/attendance/bulk', data);
    return response.data as Attendance[];
  },

  getAll: async (params?: {
    studentId?: string;
    classId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Attendance[]> => {
    const response = await apiClient.get<ApiResponse<Attendance[]>>('/api/attendance', { params });
    return response.data as Attendance[];
  },

  getById: async (id: string): Promise<Attendance> => {
    const response = await apiClient.get<ApiResponse<Attendance>>(`/api/attendance/${id}`);
    return response.data as Attendance;
  },

  getByClass: async (classId: string, date: string): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>(`/api/attendance/class/${classId}`, {
      params: { date },
    });
    // Backend returns { class, date, students: [{ student, attendance }] }
    return response.data;
  },

  getClassDates: async (classId: string): Promise<string[]> => {
    const response = await apiClient.get<ApiResponse<string[]>>(`/api/attendance/class/${classId}/dates`);
    return response.data as string[];
  },

  update: async (id: string, data: UpdateAttendanceRequest): Promise<Attendance> => {
    const response = await apiClient.patch<ApiResponse<Attendance>>(`/api/attendance/${id}`, data);
    return response.data as Attendance;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/attendance/${id}`);
  },
};

