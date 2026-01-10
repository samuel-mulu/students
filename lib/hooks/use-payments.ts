import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api/payments';
import { CreatePaymentRequest, ConfirmPaymentRequest } from '@/lib/types';
import { toast } from 'sonner';

export function usePayments(params?: {
  studentId?: string;
  status?: 'pending' | 'confirmed';
  month?: string;
  year?: number;
}) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: async () => {
      const payments = await paymentsApi.getAll(params);
      return { data: payments };
    },
    // Only fetch if we have at least one filter or want all payments
    // This prevents unnecessary requests
    enabled: true, // Always enabled, params are optional
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: async () => {
      const payment = await paymentsApi.getById(id);
      return { data: payment };
    },
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentRequest) => paymentsApi.create(data),
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success("Payment Created", {
        description: `Payment of $${payment.amount} has been successfully created.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to create payment. Please try again.";
      toast.error("Create Payment Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ConfirmPaymentRequest }) =>
      paymentsApi.confirm(id, data),
    onSuccess: (payment, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments', variables.id] });
      toast.success("Payment Confirmed", {
        description: `Payment of $${payment.amount} has been confirmed.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to confirm payment. Please try again.";
      toast.error("Confirm Payment Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useGenerateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) => paymentsApi.generateReceipt(paymentId),
    onSuccess: (receipt, paymentId) => {
      queryClient.invalidateQueries({ queryKey: ['payments', paymentId] });
      toast.success("Receipt Generated", {
        description: `Receipt #${receipt.receiptNumber} has been generated successfully.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to generate receipt. Please try again.";
      toast.error("Generate Receipt Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success("Payment Deleted", {
        description: "Payment has been successfully deleted.",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to delete payment. Please try again.";
      toast.error("Delete Payment Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

