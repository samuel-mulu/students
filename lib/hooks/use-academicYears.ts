import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { academicYearsApi } from "@/lib/api/academicYears";
import {
  AcademicYear,
  CreateAcademicYearRequest,
  UpdateAcademicYearRequest,
} from "@/lib/types";
import { toast } from "sonner";

export const useAcademicYears = () => {
  return useQuery({
    queryKey: ["academicYears"],
    queryFn: async () => {
      const data = await academicYearsApi.getAll();
      return { data };
    },
  });
};

export const useActiveAcademicYear = () => {
  return useQuery({
    queryKey: ["academicYear", "active"],
    queryFn: async () => {
      const data = await academicYearsApi.getActive();
      return { data };
    },
  });
};

export const useAcademicYear = (id: string) => {
  return useQuery({
    queryKey: ["academicYear", id],
    queryFn: async () => {
      const data = await academicYearsApi.getById(id);
      return { data };
    },
    enabled: !!id,
  });
};

export const useCreateAcademicYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAcademicYearRequest) =>
      academicYearsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academicYears"] });
      toast.success("Academic year created successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to create academic year", {
        description: error.errorMessage || error.message,
      });
    },
  });
};

export const useUpdateAcademicYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateAcademicYearRequest;
    }) => academicYearsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["academicYears"] });
      queryClient.invalidateQueries({
        queryKey: ["academicYear", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["academicYear", "active"] });
      toast.success("Academic year updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update academic year", {
        description: error.errorMessage || error.message,
      });
    },
  });
};

export const useActivateAcademicYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => academicYearsApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academicYears"] });
      queryClient.invalidateQueries({ queryKey: ["academicYear", "active"] });
      toast.success("Academic year activated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to activate academic year", {
        description: error.errorMessage || error.message,
      });
    },
  });
};

export const useCloseAcademicYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => academicYearsApi.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academicYears"] });
      queryClient.invalidateQueries({ queryKey: ["academicYear", "active"] });
      toast.success("Academic year closed successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to close academic year", {
        description: error.errorMessage || error.message,
      });
    },
  });
};
