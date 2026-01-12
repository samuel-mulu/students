import { useQuery } from '@tanstack/react-query';
import { reportsApi, PaymentReportsParams, RegistrarPaymentReportsParams } from '@/lib/api/reports';

export function usePaymentReports(params?: PaymentReportsParams) {
  return useQuery({
    queryKey: ['paymentReports', params],
    queryFn: async () => {
      const data = await reportsApi.getPaymentReports(params);
      return { data };
    },
  });
}

export function useRegistrarPaymentReports(params: RegistrarPaymentReportsParams) {
  return useQuery({
    queryKey: ['registrarPaymentReports', params],
    queryFn: async () => {
      const data = await reportsApi.getRegistrarPaymentReports(params);
      return { data };
    },
    enabled: !!params.academicYearId, // Only fetch if academicYearId is provided
  });
}
