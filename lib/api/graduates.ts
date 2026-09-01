import { PaginationParams, Student } from "@/lib/types";
import apiClient from "./client";

interface GraduatesBackendResponse {
  students: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const graduatesApi = {
  getAll: async (
    params?: PaginationParams & {
      academicYearId?: string;
      search?: string;
    },
  ): Promise<GraduatesBackendResponse> => {
    const response = await apiClient.get<GraduatesBackendResponse>(
      "/api/students/graduates",
      { params },
    );
    return response.data;
  },
};
