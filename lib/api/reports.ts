import apiClient from './client';

export interface PaymentReportsParams {
  academicYearId?: string;
  paymentTypeId?: string;
  month?: string; // YYYY-MM format
  registrarId?: string;
}

export interface PaymentReportsSummary {
  totalRevenue: number;
  monthlyRevenue: number;
  paymentCount: number;
  confirmedPaymentCount: number;
  totalStudents: number;
  paidStudents: number;
  paymentProgress: number; // Percentage
}

export interface MonthlyBreakdown {
  month: string;
  amount: number;
  count: number;
}

export interface PaymentTypeReport {
  paymentTypeId: string;
  paymentTypeName: string;
  totalAmount: number;
  monthlyBreakdown: MonthlyBreakdown[];
}

export interface MonthReport {
  month: string;
  totalAmount: number;
  paymentCount: number;
  breakdown: Array<{
    paymentTypeId: string;
    paymentTypeName: string;
    amount: number;
  }>;
}

export interface PaymentReportsResponse {
  summary: PaymentReportsSummary;
  byPaymentType: PaymentTypeReport[];
  byMonth: MonthReport[];
}

export const reportsApi = {
  getPaymentReports: async (params?: PaymentReportsParams): Promise<PaymentReportsResponse> => {
    const response = await apiClient.get<PaymentReportsResponse>('/api/reports/payments', { params });
    return response.data;
  },
};
