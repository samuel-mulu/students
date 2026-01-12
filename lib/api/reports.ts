import apiClient from './client';

export interface PaymentReportsParams {
  academicYearId?: string;
  paymentTypeId?: string;
  month?: string; // YYYY-MM format
  registrarId?: string;
  paymentMethod?: string; // cash, bank_transfer, card
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
  totalStudents?: number;
  paidStudents?: number;
  unpaidStudents?: number;
  paymentProgress?: number; // Percentage
}

export interface PaymentReportsResponse {
  summary: PaymentReportsSummary;
  byPaymentType: PaymentTypeReport[];
  byMonth: MonthReport[];
}

export interface RegistrarPaymentReportsParams {
  academicYearId: string;
  paymentTypeId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  paymentMethod?: string; // cash, bank_transfer, card
  month?: string; // YYYY-MM format
}

export interface RegistrarPaymentReportsSummary {
  totalRevenue: number;
  todayRevenue: number;
  paymentCount: number;
}

export interface DateBreakdown {
  paymentTypeId: string;
  paymentTypeName: string;
  amount: number;
  count: number;
}

export interface DateReport {
  date: string; // YYYY-MM-DD
  totalAmount: number;
  paymentCount: number;
  breakdown: DateBreakdown[];
}

export interface RegistrarPaymentReportsResponse {
  summary: RegistrarPaymentReportsSummary;
  byDate: DateReport[];
}

export const reportsApi = {
  getPaymentReports: async (params?: PaymentReportsParams): Promise<PaymentReportsResponse> => {
    const response = await apiClient.get<PaymentReportsResponse>('/api/reports/payments', { params });
    return response.data;
  },
  getRegistrarPaymentReports: async (params: RegistrarPaymentReportsParams): Promise<RegistrarPaymentReportsResponse> => {
    const response = await apiClient.get<RegistrarPaymentReportsResponse>('/api/reports/payments/registrar', { params });
    return response.data;
  },
};
