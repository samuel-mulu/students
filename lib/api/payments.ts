import apiClient from './client';
import {
  Payment,
  CreatePaymentRequest,
  ConfirmPaymentRequest,
  Receipt,
  ApiResponse,
} from '@/lib/types';

export const paymentsApi = {
  create: async (data: CreatePaymentRequest): Promise<Payment> => {
    const response = await apiClient.post<ApiResponse<Payment>>('/api/payments', data);
    return response.data as Payment;
  },

  getAll: async (params?: {
    studentId?: string;
    status?: 'pending' | 'confirmed';
    month?: string;
    year?: number;
  }): Promise<Payment[]> => {
    const response = await apiClient.get<ApiResponse<Payment[]>>('/api/payments', { params });
    return response.data as Payment[];
  },

  getById: async (id: string): Promise<Payment> => {
    const response = await apiClient.get<ApiResponse<Payment>>(`/api/payments/${id}`);
    return response.data as Payment;
  },

  confirm: async (id: string, data?: ConfirmPaymentRequest): Promise<Payment> => {
    const response = await apiClient.post<ApiResponse<Payment>>(`/api/payments/${id}/confirm`, data);
    return response.data as Payment;
  },

  generateReceipt: async (paymentId: string): Promise<Receipt> => {
    const response = await apiClient.post<ApiResponse<Receipt>>(`/api/payments/${paymentId}/receipt`);
    return response.data as Receipt;
  },

  getReceiptById: async (id: string): Promise<Receipt> => {
    const response = await apiClient.get<ApiResponse<Receipt>>(`/api/payments/receipts/${id}`);
    return response.data as Receipt;
  },

  getReceiptByNumber: async (receiptNumber: string): Promise<Receipt> => {
    const response = await apiClient.get<ApiResponse<Receipt>>(`/api/payments/receipts/number/${receiptNumber}`);
    return response.data as Receipt;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/payments/${id}`);
  },
};

