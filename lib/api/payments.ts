import apiClient from './client';
import {
  Payment,
  CreatePaymentRequest,
  ConfirmPaymentRequest,
  Receipt
} from '@/lib/types';

export const paymentsApi = {
  create: async (data: CreatePaymentRequest): Promise<Payment> => {
    const response = await apiClient.post<Payment>('/api/payments', data);
    return response.data;
  },

  getAll: async (params?: {
    studentId?: string;
    status?: 'pending' | 'confirmed';
    month?: string;
    year?: number;
  }): Promise<Payment[]> => {
    const response = await apiClient.get<Payment[]>('/api/payments', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Payment> => {
    const response = await apiClient.get<Payment>(`/api/payments/${id}`);
    return response.data;
  },

  confirm: async (id: string, data?: ConfirmPaymentRequest): Promise<Payment> => {
    const response = await apiClient.post<Payment>(`/api/payments/${id}/confirm`, data);
    return response.data;
  },

  generateReceipt: async (paymentId: string): Promise<Receipt> => {
    const response = await apiClient.post<Receipt>(`/api/payments/${paymentId}/receipt`);
    return response.data;
  },

  getReceiptById: async (id: string): Promise<Receipt> => {
    const response = await apiClient.get<Receipt>(`/api/payments/receipts/${id}`);
    return response.data;
  },

  getReceiptByNumber: async (receiptNumber: string): Promise<Receipt> => {
    const response = await apiClient.get<Receipt>(`/api/payments/receipts/number/${receiptNumber}`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/payments/${id}`);
  },
};


