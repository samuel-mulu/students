import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { termsApi } from '@/lib/api/terms';
import { CreateTermRequest, UpdateTermRequest } from '@/lib/types';
import { toast } from 'sonner';

export function useTerms() {
  return useQuery({
    queryKey: ['terms'],
    queryFn: async () => {
      const terms = await termsApi.getAll();
      return { data: terms };
    },
  });
}

export function useTermsByAcademicYear(academicYearId: string) {
  return useQuery({
    queryKey: ['terms', 'academicYear', academicYearId],
    queryFn: async () => {
      const terms = await termsApi.getByAcademicYear(academicYearId);
      return { data: terms };
    },
    enabled: !!academicYearId,
  });
}

export function useCreateTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermRequest) => termsApi.create(data),
    onSuccess: (term) => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      toast.success("Term Created", {
        description: `Term "${term.name}" has been successfully created.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to create term. Please try again.";
      toast.error("Create Term Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useUpdateTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTermRequest }) =>
      termsApi.update(id, data),
    onSuccess: (term) => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      queryClient.invalidateQueries({ queryKey: ['promotion'] });
      toast.success('Term updated successfully', {
        description: `"${term.name}" has been saved. Existing marks are unchanged.`,
        duration: 4000,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to update term', {
        description: error.errorMessage || error.message,
      });
    },
  });
}

export function useCloseTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => termsApi.close(id),
    onSuccess: (term) => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      queryClient.invalidateQueries({ queryKey: ['promotion'] });
      toast.success('Term closed successfully', {
        description: `"${term.name}" is now closed.`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to close term', {
        description: error.errorMessage || error.message,
      });
    },
  });
}

export function useOpenTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => termsApi.open(id),
    onSuccess: (term) => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      queryClient.invalidateQueries({ queryKey: ['promotion'] });
      toast.success('Term reopened successfully', {
        description: `"${term.name}" is now open.`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to reopen term', {
        description: error.errorMessage || error.message,
      });
    },
  });
}

