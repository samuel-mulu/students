import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionApi } from '@/lib/api/promotion';
import { PromotionPreviewParams } from '@/lib/types';
import { toast } from 'sonner';

export const usePromotionPreview = (
  params?: PromotionPreviewParams,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['promotion', 'preview', params?.classId ?? 'all', params?.includeStudents ?? true],
    queryFn: async () => {
      const data = await promotionApi.getPreview(params);
      return { data };
    },
    enabled: options?.enabled ?? true,
  });
};

export const usePromotionSummary = () => {
  return useQuery({
    queryKey: ['promotion', 'preview', 'summary'],
    queryFn: async () => {
      const data = await promotionApi.getPreview({ includeStudents: false });
      return { data };
    },
  });
};

export const usePromoteStudents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => promotionApi.execute(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['promotion'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['academicYears'] });
      queryClient.invalidateQueries({ queryKey: ['academicYear', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      const termsNote =
        result.termsCreated?.length > 0
          ? ` Terms created: ${result.termsCreated.join(', ')}.`
          : '';
      const alreadyNote = result.alreadyProcessed
        ? `, Already done: ${result.alreadyProcessed}`
        : '';
      toast.success(result.message || 'Promotion completed', {
        description: `Promoted: ${result.promoted}, Repeated: ${result.repeated}, Graduated: ${result.graduated}${result.skipped ? `, Skipped: ${result.skipped}` : ''}${alreadyNote}. New year: ${result.newAcademicYear?.name}.${termsNote}`,
      });
      if (result.errors && result.errors.length > 0) {
        toast.warning(`${result.errors.length} student(s) had errors`, {
          description: result.errors.slice(0, 3).map((e) => e.studentName || e.studentId).join(', '),
        });
      }
    },
    onError: (error: any) => {
      toast.error('Failed to promote students', {
        description: error.errorMessage || error.message,
      });
    },
  });
};
