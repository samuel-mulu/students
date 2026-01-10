import apiClient from './client';
import {
  Payment,
  CreatePaymentRequest,
  ConfirmPaymentRequest,
  Receipt
} from '@/lib/types';

// Backend returns { payments: Payment[], pagination: {...} }
interface PaymentsBackendResponse {
  payments: Payment[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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
    const response = await apiClient.get<PaymentsBackendResponse>('/api/payments', { params });
    // Response interceptor extracts data, backend returns { payments, pagination }
    const result = response.data;
    // Return payments array (handle both formats for backward compatibility)
    if (result && 'payments' in result && Array.isArray(result.payments)) {
      return result.payments;
    }
    // Fallback to array if already an array
    return Array.isArray(result) ? result : [];
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


