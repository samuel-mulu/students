import apiClient from './client';
import {
  Payment,
  CreatePaymentRequest,
  CreateBulkPaymentRequest,
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
    const proofImageUrl =
      typeof data.proofImageUrl === "string" ? data.proofImageUrl.trim() : undefined;
    // Don't send empty-string proofImageUrl; backend validates strict URL when present.
    const payload: CreatePaymentRequest = {
      ...data,
      ...(proofImageUrl ? { proofImageUrl } : {}),
    };
    if (!proofImageUrl) {
      delete (payload as any).proofImageUrl;
    }

    const response = await apiClient.post<Payment>("/api/payments", payload);
    return response.data;
  },

  createBulk: async (data: CreateBulkPaymentRequest): Promise<Payment[]> => {
    const proofImageUrl =
      typeof data.proofImageUrl === "string" ? data.proofImageUrl.trim() : undefined;
    // Don't send empty-string proofImageUrl; backend validates strict URL when present.
    const payload: CreateBulkPaymentRequest = {
      ...data,
      ...(proofImageUrl ? { proofImageUrl } : {}),
    };
    if (!proofImageUrl) {
      delete (payload as any).proofImageUrl;
    }

    const response = await apiClient.post<{ payments: Payment[] }>(
      "/api/payments/bulk",
      payload
    );
    return response.data.payments || [];
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
    const proofImageUrl =
      typeof data?.proofImageUrl === "string" ? data.proofImageUrl.trim() : undefined;
    const payload: ConfirmPaymentRequest | undefined = data
      ? ({
          ...data,
          ...(proofImageUrl ? { proofImageUrl } : {}),
        } as ConfirmPaymentRequest)
      : undefined;
    if (payload && !proofImageUrl) {
      delete (payload as any).proofImageUrl;
    }

    const response = await apiClient.post<Payment>(
      `/api/payments/${id}/confirm`,
      payload
    );
    return response.data;
  },

  confirmBulk: async (paymentIds: string[], data?: ConfirmPaymentRequest): Promise<{ receipt: Receipt; payments: Payment[] }> => {
    const proofImageUrl =
      typeof data?.proofImageUrl === "string" ? data.proofImageUrl.trim() : undefined;
    const payload: any = {
      paymentIds,
      ...(data || {}),
      ...(proofImageUrl ? { proofImageUrl } : {}),
    };
    if (!proofImageUrl) {
      delete payload.proofImageUrl;
    }

    const response = await apiClient.post<{ receipt: Receipt; payments: Payment[] }>(
      "/api/payments/bulk/confirm",
      payload
    );
    return response.data;
  },

  generateReceipt: async (paymentId: string): Promise<Receipt> => {
    const response = await apiClient.post<Receipt>(`/api/payments/${paymentId}/receipt`);
    return response.data;
  },

  getReceiptById: async (id: string): Promise<{ receipt: Receipt; payments: Payment[] }> => {
    const response = await apiClient.get<{ receipt: Receipt; payments: Payment[] }>(`/api/payments/receipts/${id}`);
    return response.data;
  },

  getReceiptByNumber: async (receiptNumber: string): Promise<{ receipt: Receipt; payments: Payment[] }> => {
    const response = await apiClient.get<{ receipt: Receipt; payments: Payment[] }>(`/api/payments/receipts/number/${receiptNumber}`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/payments/${id}`);
  },

  uploadProof: async (file: File): Promise<{ imageUrl: string; publicId: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post<{ imageUrl: string; publicId: string }>(
      '/api/payments/upload-proof',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data;
  },
};


