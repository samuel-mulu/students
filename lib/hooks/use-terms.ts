import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { termsApi } from '@/lib/api/terms';
import { CreateTermRequest } from '@/lib/types';

export function useTerms() {
  return useQuery({
    queryKey: ['terms'],
    queryFn: async () => {
      const terms = await termsApi.getAll();
      return { data: terms };
    },
  });
}

export function useCreateTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermRequest) => termsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
    },
  });
}

