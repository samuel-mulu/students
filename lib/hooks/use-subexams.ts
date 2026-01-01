import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subexamsApi } from '@/lib/api/subexams';
import { CreateSubExamRequest, UpdateSubExamRequest } from '@/lib/types';

export function useSubExams(subjectId: string, termId: string) {
  return useQuery({
    queryKey: ['subexams', subjectId, termId],
    queryFn: async () => {
      const subexams = await subexamsApi.getBySubjectAndTerm(subjectId, termId);
      return { data: subexams };
    },
    enabled: !!subjectId && !!termId,
  });
}

export function useCreateSubExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubExamRequest) => subexamsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subexams'] });
    },
  });
}

export function useUpdateSubExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubExamRequest }) =>
      subexamsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subexams'] });
    },
  });
}

export function useDeleteSubExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => subexamsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subexams'] });
    },
  });
}

