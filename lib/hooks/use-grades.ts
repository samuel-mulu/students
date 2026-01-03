import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradesApi } from '@/lib/api/grades';
import { Grade, CreateGradeRequest, UpdateGradeRequest } from '@/lib/types';
import { toast } from 'sonner';

export const useGrades = () => {
  return useQuery({
    queryKey: ['grades'],
    queryFn: async () => {
      const data = await gradesApi.getAll();
      return { data };
    },
  });
};

export const useGrade = (id: string) => {
  return useQuery({
    queryKey: ['grade', id],
    queryFn: async () => {
      const data = await gradesApi.getById(id);
      return { data };
    },
    enabled: !!id,
  });
};

export const useCreateGrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGradeRequest) => gradesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      toast.success('Grade created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create grade', {
        description: error.errorMessage || error.message,
      });
    },
  });
};

export const useUpdateGrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGradeRequest }) =>
      gradesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['grade', variables.id] });
      toast.success('Grade updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update grade', {
        description: error.errorMessage || error.message,
      });
    },
  });
};

export const useDeleteGrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => gradesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      toast.success('Grade deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete grade', {
        description: error.errorMessage || error.message,
      });
    },
  });
};

