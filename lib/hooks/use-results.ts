import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resultsApi } from '@/lib/api/results';
import { CreateMarkRequest, RecordMarkRequest, UpdateMarkRequest } from '@/lib/types';
import { toast } from 'sonner';

export function useResults(params?: {
  studentId?: string;
  classId?: string;
  subjectId?: string;
  termId?: string;
  subExamId?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) {
  const { enabled, ...queryParams } = params || {};
  
  // Default enabled to true if not specified, but allow explicit control
  const isEnabled = enabled !== undefined ? enabled : true;
  
  return useQuery({
    queryKey: ['results', queryParams],
    queryFn: async () => {
      const results = await resultsApi.getAll(queryParams);
      return { data: results };
    },
    enabled: isEnabled,
    refetchOnMount: isEnabled ? 'always' : false,
    staleTime: 0,
  });
}

export function useResultsByClassAndTerm(classId: string, subjectId: string, termId: string) {
  return useQuery({
    queryKey: ['results', 'class', classId, 'subject', subjectId, 'term', termId],
    queryFn: async () => {
      const results = await resultsApi.getByClassAndTerm(classId, termId, subjectId);
      return { data: results };
    },
    enabled: !!classId && !!subjectId && !!termId,
    staleTime: 0, // Always consider data stale to refetch on mount
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

export function useCreateResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMarkRequest) => resultsApi.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      toast.success("Result Created", {
        description: `Result of ${result.score}/${result.maxScore} has been recorded.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to create result. Please try again.";
      toast.error("Create Result Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useRecordResult(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const silent = options?.silent ?? false;

  return useMutation({
    mutationFn: ({
      studentId,
      subExamId,
      termId,
      data,
    }: {
      studentId: string;
      subExamId: string;
      termId: string;
      data: RecordMarkRequest;
    }) => resultsApi.record(studentId, subExamId, termId, data),
    onSuccess: (result, variables) => {
      // Invalidate all results queries - this will trigger refetch for active queries
      queryClient.invalidateQueries({ queryKey: ['results'] });
      if (!silent) {
        toast.success("Result Recorded", {
          description: `Result of ${result.score}/${result.maxScore} has been recorded.`,
          duration: 3000,
        });
      }
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to record result. Please try again.";
      toast.error("Record Result Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useRecordBulkResults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subExamId,
      termId,
      marksData,
    }: {
      subExamId: string;
      termId: string;
      marksData: Array<{ studentId: string; score: number; notes?: string }>;
    }) => resultsApi.recordBulk(subExamId, termId, marksData),
    onSuccess: (results, variables) => {
      // Invalidate all results queries - this will trigger refetch for active queries
      queryClient.invalidateQueries({ queryKey: ['results'] });
      const successCount = results.filter((r: any) => r.success).length;
      const totalCount = variables.marksData.length;
      toast.success("Results Recorded", {
        description: `Successfully recorded ${successCount} out of ${totalCount} results.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to record results. Please try again.";
      toast.error("Record Results Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useUpdateResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMarkRequest }) =>
      resultsApi.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      toast.success("Result Updated", {
        description: `Result has been updated to ${result.score}/${result.maxScore}.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to update result. Please try again.";
      toast.error("Update Result Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useCalculateTermScore(termId: string, studentId: string, subjectId: string) {
  return useQuery({
    queryKey: ['results', 'calculate', 'term', termId, studentId, subjectId],
    queryFn: () => resultsApi.calculateTermScore(termId, studentId, subjectId),
    enabled: !!termId && !!studentId && !!subjectId,
  });
}

export function useRosterResults(classId: string, termId: string) {
  return useQuery({
    queryKey: ['results', 'roster', classId, termId],
    queryFn: async () => {
      const data = await resultsApi.getRoster(classId, termId);
      return { data };
    },
    enabled: !!classId && !!termId,
  });
}

export function useRosterResultsSemesters(classId: string) {
  return useQuery({
    queryKey: ['results', 'roster', 'semesters', classId],
    queryFn: async () => {
      const data = await resultsApi.getRosterSemesters(classId);
      return { data };
    },
    enabled: !!classId,
  });
}

// Legacy exports for backward compatibility (can be removed later)
export const useMarks = useResults;
export const useMarksByClassAndTerm = useResultsByClassAndTerm;
export const useCreateMark = useCreateResult;
export const useRecordMark = useRecordResult;
export const useRecordBulkMarks = useRecordBulkResults;
export const useUpdateMark = useUpdateResult;
