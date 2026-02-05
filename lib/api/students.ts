import {
  AssignClassRequest,
  CreateStudentRequest,
  PaginationParams,
  Student,
  TransferClassRequest,
  UpdateStudentRequest,
} from "@/lib/types";
import apiClient from "./client";

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
  getAll: async (
    params?: PaginationParams & {
      classStatus?: "new" | "assigned";
      paymentStatus?: "pending" | "confirmed";
      classId?: string;
      gradeId?: string;
      search?: string;
      month?: string;
      year?: number;
    },
  ): Promise<StudentsBackendResponse> => {
    const response = await apiClient.get<StudentsBackendResponse>(
      "/api/students",
      { params },
    );
    // Response interceptor extracts data, backend returns { students, pagination }
    return response.data;
  },

  getById: async (id: string): Promise<Student> => {
    const response = await apiClient.get<Student>(`/api/students/${id}`);
    return response.data;
  },

  create: async (data: CreateStudentRequest): Promise<Student> => {
    const response = await apiClient.post<Student>("/api/students", data);
    return response.data;
  },

  update: async (id: string, data: UpdateStudentRequest): Promise<Student> => {
    const response = await apiClient.patch<Student>(
      `/api/students/${id}`,
      data,
    );
    return response.data;
  },

  assignClass: async (
    id: string,
    data: AssignClassRequest,
  ): Promise<Student> => {
    const response = await apiClient.post<Student>(
      `/api/students/${id}/assign-class`,
      data,
    );
    return response.data;
  },

  transfer: async (
    id: string,
    data: TransferClassRequest,
  ): Promise<Student> => {
    const response = await apiClient.post<Student>(
      `/api/students/${id}/transfer`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/students/${id}`);
  },

  uploadImage: async (
    file: File,
  ): Promise<{ imageUrl: string; publicId: string }> => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await apiClient.post<{
      imageUrl: string;
      publicId: string;
    }>("/api/students/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  toggleParentsPortal: async (
    id: string,
    parentsPortal: boolean,
  ): Promise<Student> => {
    const response = await apiClient.patch<Student>(
      `/api/students/${id}/toggle-parents-portal`,
      {
        parentsPortal,
      },
    );
    return response.data;
  },
};
