import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marksApi } from '@/lib/api/marks';
import { CreateMarkRequest, RecordMarkRequest, UpdateMarkRequest } from '@/lib/types';
import { toast } from 'sonner';

export function useMarks(params?: {
  studentId?: string;
  classId?: string;
  subjectId?: string;
  termId?: string;
  subExamId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['marks', params],
    queryFn: async () => {
      const marks = await marksApi.getAll(params);
      return { data: marks };
    },
  });
}

export function useMarksByClassAndTerm(classId: string, subjectId: string, termId: string) {
  return useQuery({
    queryKey: ['marks', 'class', classId, 'subject', subjectId, 'term', termId],
    queryFn: async () => {
      const marks = await marksApi.getByClassAndTerm(classId, termId, subjectId);
      return { data: marks };
    },
    enabled: !!classId && !!subjectId && !!termId,
  });
}

export function useCreateMark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMarkRequest) => marksApi.create(data),
    onSuccess: (mark) => {
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      toast.success("Mark Created", {
        description: `Mark of ${mark.score}/${mark.maxScore} has been recorded.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to create mark. Please try again.";
      toast.error("Create Mark Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useRecordMark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      studentId,
      subExamId,
      data,
    }: {
      studentId: string;
      subExamId: string;
      data: RecordMarkRequest;
    }) => marksApi.record(studentId, subExamId, data),
    onSuccess: (mark) => {
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      toast.success("Mark Recorded", {
        description: `Mark of ${mark.score}/${mark.maxScore} has been recorded.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to record mark. Please try again.";
      toast.error("Record Mark Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useRecordBulkMarks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subExamId,
      marksData,
    }: {
      subExamId: string;
      marksData: Array<{ studentId: string; score: number; notes?: string }>;
    }) => marksApi.recordBulk(subExamId, marksData),
    onSuccess: (results, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      const successCount = results.filter((r: any) => r.success).length;
      const totalCount = variables.marksData.length;
      toast.success("Marks Recorded", {
        description: `Successfully recorded ${successCount} out of ${totalCount} marks.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to record marks. Please try again.";
      toast.error("Record Marks Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useUpdateMark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMarkRequest }) =>
      marksApi.update(id, data),
    onSuccess: (mark) => {
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      toast.success("Mark Updated", {
        description: `Mark has been updated to ${mark.score}/${mark.maxScore}.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to update mark. Please try again.";
      toast.error("Update Mark Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useCalculateTermScore(termId: string, studentId: string, subjectId: string) {
  return useQuery({
    queryKey: ['marks', 'calculate', 'term', termId, studentId, subjectId],
    queryFn: () => marksApi.calculateTermScore(termId, studentId, subjectId),
    enabled: !!termId && !!studentId && !!subjectId,
  });
}

export function useRoster(classId: string, termId?: string) {
  return useQuery({
    queryKey: ['marks', 'roster', classId, termId],
    queryFn: () => marksApi.getRoster(classId, termId),
    enabled: !!classId,
  });
}

