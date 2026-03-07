import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { homeworkApi } from '@/lib/api/homework';
import {
  CreateHomeworkRequest,
  BulkHomeworkRequest,
  UpdateHomeworkRequest,
} from '@/lib/types';
import { toast } from 'sonner';

export function useHomework(params?: {
  studentId?: string;
  classId?: string;
  subjectId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: 'done' | 'not_done';
  page?: number;
  limit?: number;
  enabled?: boolean;
}) {
  const { enabled, ...queryParams } = params || {};
  
  // Default enabled to true if not specified, but allow explicit control
  const isEnabled = enabled !== undefined ? enabled : true;
  
  return useQuery({
    queryKey: ['homework', queryParams],
    queryFn: async () => {
      const homework = await homeworkApi.getAll(queryParams);
      return { data: homework };
    },
    enabled: isEnabled,
    refetchOnMount: isEnabled ? 'always' : false,
    staleTime: 0,
  });
}

export function useHomeworkByClass(classId: string, date: string, subjectId?: string) {
  return useQuery({
    queryKey: ['homework', 'class', classId, date, subjectId],
    queryFn: async () => {
      const homework = await homeworkApi.getByClass(classId, date, subjectId);
      return { data: homework };
    },
    enabled: !!classId && !!date,
  });
}

export function useClassHomeworkDates(classId: string) {
  return useQuery({
    queryKey: ['homework', 'class', classId, 'dates'],
    queryFn: async () => {
      const dates = await homeworkApi.getClassDates(classId);
      return { data: dates };
    },
    enabled: !!classId,
    staleTime: 1000, // Consider data stale after 1 second
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

export function useClassHomeworkSummary(classId: string) {
  return useQuery({
    queryKey: ['homework', 'class', classId, 'summary'],
    queryFn: async () => {
      const summary = await homeworkApi.getClassSummary(classId);
      return { data: summary };
    },
    enabled: !!classId,
    staleTime: 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useBulkHomework() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkHomeworkRequest) => homeworkApi.createBulk(data),
    onSuccess: (result, variables) => {
      // Invalidate all homework queries
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      // Specifically invalidate the dates query to ensure it refreshes
      queryClient.invalidateQueries({
        queryKey: ['homework', 'class', variables.classId, 'dates'],
      });
      // Invalidate the summary query
      queryClient.invalidateQueries({
        queryKey: ['homework', 'class', variables.classId, 'summary'],
      });
      // Invalidate all queries for this class and date (including any subjectId variations)
      queryClient.invalidateQueries({
        queryKey: ['homework', 'class', variables.classId, variables.date],
      });
      // Force refetch the dates and summary queries
      queryClient.refetchQueries({
        queryKey: ['homework', 'class', variables.classId, 'dates'],
      });
      queryClient.refetchQueries({
        queryKey: ['homework', 'class', variables.classId, 'summary'],
      });
      // Refetch the current date query to update the "Recorded" badge
      queryClient.refetchQueries({
        queryKey: ['homework', 'class', variables.classId, variables.date],
      });
      const count = variables.homeworkData.length;
      toast.success("Homework Recorded", {
        description: `Homework for ${count} student${count > 1 ? 's' : ''} has been recorded.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to record homework. Please try again.";
      toast.error("Record Homework Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useUpdateHomework() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHomeworkRequest }) =>
      homeworkApi.update(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      // Invalidate specific class and date queries
      queryClient.invalidateQueries({
        queryKey: ['homework', 'class'],
      });
      queryClient.invalidateQueries({
        queryKey: ['homework', 'class', 'dates'],
      });
      queryClient.invalidateQueries({
        queryKey: ['homework', 'class', 'summary'],
      });
      toast.success("Homework Updated", {
        description: "Homework record has been successfully updated.",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to update homework. Please try again.";
      toast.error("Update Homework Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}
