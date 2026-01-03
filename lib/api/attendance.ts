import apiClient from './client';
import {
  Attendance,
  CreateAttendanceRequest,
  BulkAttendanceRequest,
  UpdateAttendanceRequest
} from '@/lib/types';

export const attendanceApi = {
  create: async (data: CreateAttendanceRequest): Promise<Attendance> => {
    const response = await apiClient.post<Attendance>('/api/attendance', data);
    return response.data;
  },

  createBulk: async (data: BulkAttendanceRequest): Promise<Attendance[]> => {
    const response = await apiClient.post<Attendance[]>('/api/attendance/bulk', data);
    return response.data;
  },

  getAll: async (params?: {
    studentId?: string;
    classId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Attendance[]> => {
    const response = await apiClient.get<Attendance[]>('/api/attendance', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Attendance> => {
    const response = await apiClient.get<Attendance>(`/api/attendance/${id}`);
    return response.data;
  },

  getByClass: async (classId: string, date: string): Promise<any> => {
    const response = await apiClient.get<any>(`/api/attendance/class/${classId}`, {
      params: { date },
    });
    // Backend returns { class, date, students: [{ student, attendance }] }
    return response.data;
  },

  getClassDates: async (classId: string): Promise<string[]> => {
    const response = await apiClient.get<string[]>(`/api/attendance/class/${classId}/dates`);
    return response.data;
  },

  update: async (id: string, data: UpdateAttendanceRequest): Promise<Attendance> => {
    const response = await apiClient.patch<Attendance>(`/api/attendance/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/attendance/${id}`);
  },
};


