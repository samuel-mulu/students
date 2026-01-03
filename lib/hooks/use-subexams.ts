import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subexamsApi } from '@/lib/api/subexams';
import { CreateSubExamRequest, UpdateSubExamRequest } from '@/lib/types';
import { toast } from 'sonner';

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
    onSuccess: (subExam) => {
      queryClient.invalidateQueries({ queryKey: ['subexams'] });
      toast.success("Sub-Exam Created", {
        description: `Sub-exam "${subExam.name}" has been successfully created.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to create sub-exam. Please try again.";
      toast.error("Create Sub-Exam Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useUpdateSubExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubExamRequest }) =>
      subexamsApi.update(id, data),
    onSuccess: (subExam) => {
      queryClient.invalidateQueries({ queryKey: ['subexams'] });
      toast.success("Sub-Exam Updated", {
        description: `Sub-exam "${subExam.name}" has been successfully updated.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to update sub-exam. Please try again.";
      toast.error("Update Sub-Exam Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useDeleteSubExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => subexamsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subexams'] });
      toast.success("Sub-Exam Deleted", {
        description: "Sub-exam has been successfully deleted.",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to delete sub-exam. Please try again.";
      toast.error("Delete Sub-Exam Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

