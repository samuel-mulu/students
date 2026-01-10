import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentTypesApi } from '@/lib/api/payment-types';
import { PaymentType, CreatePaymentTypeRequest, UpdatePaymentTypeRequest } from '@/lib/types';
import { toast } from 'sonner';

export const usePaymentTypes = (includeInactive?: boolean) => {
  return useQuery({
    queryKey: ['paymentTypes', { includeInactive }],
    queryFn: async () => {
      const data = await paymentTypesApi.getAll(includeInactive);
      return { data };
    },
  });
};

export const usePaymentType = (id: string) => {
  return useQuery({
    queryKey: ['paymentType', id],
    queryFn: async () => {
      const data = await paymentTypesApi.getById(id);
      return { data };
    },
    enabled: !!id,
  });
};

export const useCreatePaymentType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentTypeRequest) => paymentTypesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentTypes'] });
      toast.success('Payment type created successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to create payment type. Please try again.";
      toast.error('Failed to create payment type', {
        description: errorMessage,
      });
    },
  });
};

export const useUpdatePaymentType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentTypeRequest }) =>
      paymentTypesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['paymentTypes'] });
      queryClient.invalidateQueries({ queryKey: ['paymentType', variables.id] });
      toast.success('Payment type updated successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to update payment type. Please try again.";
      toast.error('Failed to update payment type', {
        description: errorMessage,
      });
    },
  });
};

export const useDeletePaymentType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentTypesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentTypes'] });
      toast.success('Payment type deleted successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to delete payment type. Please try again.";
      toast.error('Failed to delete payment type', {
        description: errorMessage,
      });
    },
  });
};
