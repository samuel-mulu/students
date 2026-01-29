import { studentsApi } from "@/lib/api/students";
import {
    AssignClassRequest,
    CreateStudentRequest,
    PaginationParams,
    TransferClassRequest,
    UpdateStudentRequest,
} from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useStudents(
  params?: PaginationParams & {
    classStatus?: "new" | "assigned";
    paymentStatus?: "pending" | "confirmed";
    classId?: string;
    gradeId?: string;
    search?: string;
    month?: string;
    year?: number;
  }
) {
  return useQuery({
    queryKey: ["students", params],
    queryFn: async () => {
      const result = await studentsApi.getAll(params);
      // Backend returns { students: Student[], pagination: {...} }
      return {
        data: result.students || [],
        pagination: result.pagination,
      };
    },
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ["students", id],
    queryFn: async () => {
      const student = await studentsApi.getById(id);
      return { data: student };
    },
    enabled: !!id,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStudentRequest) => studentsApi.create(data),
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      // Optionally add the new student to cache
      queryClient.setQueryData(["students", student.id], { data: student });
      toast.success("Student Created", {
        description: `${student.firstName} ${student.lastName} has been successfully added.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      // Get error message from API client interceptor or fallback to response
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to create student. Please try again.";
      
      toast.error("Create Student Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudentRequest }) =>
      studentsApi.update(id, data),
    onSuccess: (student, variables) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.setQueryData(["students", variables.id], { data: student });
      toast.success("Student Updated", {
        description: `${student.firstName} ${student.lastName}'s information has been updated.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to update student. Please try again.";
      toast.error("Update Student Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useAssignClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignClassRequest }) =>
      studentsApi.assignClass(id, data),
    onSuccess: (student, variables) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.setQueryData(["students", variables.id], { data: student });
      toast.success("Class Assigned", {
        description: `${student.firstName} ${student.lastName} has been assigned to a class.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to assign class. Please try again.";
      toast.error("Assign Class Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useTransferClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransferClassRequest }) =>
      studentsApi.transfer(id, data),
    onSuccess: (student, variables) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.setQueryData(["students", variables.id], { data: student });
      toast.success("Class Transferred", {
        description: `${student.firstName} ${student.lastName} has been transferred to a new class.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to transfer class. Please try again.";
      toast.error("Transfer Class Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student Deleted", {
        description: "Student has been successfully deleted.",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to delete student. Please try again.";
      toast.error("Delete Student Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}
