import apiClient from './client';
import { StudentReport, ClassReport, Payment, ApiResponse } from '@/lib/types';

export const reportsApi = {
  getStudentReport: async (studentId: string): Promise<StudentReport> => {
    const response = await apiClient.get<ApiResponse<StudentReport>>(`/api/reports/student/${studentId}`);
    return response.data as StudentReport;
  },

  getStudentPayments: async (studentId: string): Promise<Payment[]> => {
    const response = await apiClient.get<ApiResponse<Payment[]>>(`/api/reports/student/${studentId}/payments`);
    return response.data as Payment[];
  },

  getClassReport: async (classId: string): Promise<ClassReport> => {
    const response = await apiClient.get<ApiResponse<ClassReport>>(`/api/reports/class/${classId}`);
    return response.data as ClassReport;
  },
};

