import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionApi } from '@/lib/api/promotion';
import { toast } from 'sonner';

export const usePromotionPreview = () => {
  return useQuery({
    queryKey: ['promotion', 'preview'],
    queryFn: async () => {
      const data = await promotionApi.getPreview();
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
      toast.success('Promotion completed successfully', {
        description: `Promoted: ${result.promoted}, Repeated: ${result.repeated}, Graduated: ${result.graduated}`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to promote students', {
        description: error.errorMessage || error.message,
      });
    },
  });
};

