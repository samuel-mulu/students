import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { classesApi } from "@/lib/api/classes";
import {
  CreateClassRequest,
  UpdateClassRequest,
  CreateSubjectRequest,
  UpdateSubjectRequest,
} from "@/lib/types";
import { toast } from "sonner";

export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const classes = await classesApi.getAll();
      return { data: classes };
    },
  });
}

export function useClass(id: string) {
  return useQuery({
    queryKey: ["classes", id],
    queryFn: async () => {
      const classData = await classesApi.getById(id);
      return { data: classData };
    },
    enabled: !!id,
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClassRequest) => classesApi.create(data),
    onSuccess: (classData) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class Created", {
        description: `Class "${classData.name}" has been successfully created.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error.errorMessage ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to create class. Please try again.";
      toast.error("Create Class Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClassRequest }) =>
      classesApi.update(id, data),
    onSuccess: (classData, variables) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["classes", variables.id] });
      // Invalidate users query to update teacher classes list
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Class Updated", {
        description: `Class "${classData.name}" has been successfully updated.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error.errorMessage ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to update class. Please try again.";
      toast.error("Update Class Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => classesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class Deleted", {
        description: "Class has been successfully deleted.",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error.errorMessage ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to delete class. Please try again.";
      toast.error("Delete Class Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useClassSubjects(classId: string) {
  return useQuery({
    queryKey: ["classes", classId, "subjects"],
    queryFn: async () => {
      const subjects = await classesApi.getSubjects(classId);
      return { data: subjects };
    },
    enabled: !!classId,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      classId,
      data,
    }: {
      classId: string;
      data: CreateSubjectRequest;
    }) => classesApi.createSubject(classId, data),
    onSuccess: (subject, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["classes", variables.classId, "subjects"],
      });
      toast.success("Subject Created", {
        description: `Subject "${subject.name}" has been successfully created.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error.errorMessage ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to create subject. Please try again.";
      toast.error("Create Subject Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subjectId,
      data,
    }: {
      subjectId: string;
      data: UpdateSubjectRequest;
    }) => classesApi.updateSubject(subjectId, data),
    onSuccess: (subject) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Subject Updated", {
        description: `Subject "${subject.name}" has been successfully updated.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error.errorMessage ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to update subject. Please try again.";
      toast.error("Update Subject Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subjectId: string) => classesApi.deleteSubject(subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Subject Deleted", {
        description: "Subject has been successfully deleted.",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error.errorMessage ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to delete subject. Please try again.";
      toast.error("Delete Subject Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useClassesByGrade(gradeId: string) {
  return useQuery({
    queryKey: ["classes", "grade", gradeId],
    queryFn: async () => {
      const classes = await classesApi.getByGrade(gradeId);
      return { data: classes };
    },
    enabled: !!gradeId,
  });
}

export function useClassesByGradeAndYear(gradeId: string, academicYearId: string) {
  return useQuery({
    queryKey: ["classes", "grade", gradeId, "academicYear", academicYearId],
    queryFn: async () => {
      const classes = await classesApi.getByGradeAndYear(gradeId, academicYearId);
      return { data: classes };
    },
    enabled: !!gradeId && !!academicYearId,
  });
}
