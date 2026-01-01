import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsApi } from "@/lib/api/students";
import {
  CreateStudentRequest,
  UpdateStudentRequest,
  AssignClassRequest,
  TransferClassRequest,
  PaginationParams,
} from "@/lib/types";

export function useStudents(
  params?: PaginationParams & {
    classStatus?: "new" | "assigned";
    paymentStatus?: "pending" | "confirmed";
    classId?: string;
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
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
