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
      toast.success('Promotion completed successfully', {
        description: `Promoted: ${result.promoted}, Repeated: ${result.repeated}, Graduated: ${result.graduated}. New year: ${result.newAcademicYear?.name}.${termsNote}`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to promote students', {
        description: error.errorMessage || error.message,
      });
    },
  });
};
