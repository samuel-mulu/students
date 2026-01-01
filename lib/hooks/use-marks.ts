import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marksApi } from '@/lib/api/marks';
import { CreateMarkRequest, RecordMarkRequest, UpdateMarkRequest } from '@/lib/types';

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
      const marks = await marksApi.getByClassAndTerm(classId, termId);
      return { data: marks };
    },
    enabled: !!classId && !!subjectId && !!termId,
  });
}

export function useCreateMark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMarkRequest) => marksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marks'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marks'] });
    },
  });
}

export function useUpdateMark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMarkRequest }) =>
      marksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marks'] });
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

