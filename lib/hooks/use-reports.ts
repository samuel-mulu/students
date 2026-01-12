import { useQuery } from '@tanstack/react-query';
import { reportsApi, PaymentReportsParams } from '@/lib/api/reports';

export function usePaymentReports(params?: PaymentReportsParams) {
  return useQuery({
    queryKey: ['paymentReports', params],
    queryFn: async () => {
      const data = await reportsApi.getPaymentReports(params);
      return { data };
    },
  });
}
