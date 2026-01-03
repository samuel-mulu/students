import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';
import { UpdateSettingRequest } from '@/lib/types';
import { toast } from 'sonner';

export const useSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const data = await settingsApi.getAll();
      return { data };
    },
  });
};

export const useSetting = (key: string) => {
  return useQuery({
    queryKey: ['setting', key],
    queryFn: async () => {
      const data = await settingsApi.getByKey(key);
      return { data };
    },
    enabled: !!key,
  });
};

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: UpdateSettingRequest }) =>
      settingsApi.update(key, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['setting', variables.key] });
      toast.success('Setting updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update setting', {
        description: error.errorMessage || error.message,
      });
    },
  });
};

