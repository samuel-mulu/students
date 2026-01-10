import apiClient from './client';
import {
  PaymentType,
  CreatePaymentTypeRequest,
  UpdatePaymentTypeRequest,
} from '@/lib/types';

export const paymentTypesApi = {
  getAll: async (includeInactive?: boolean): Promise<PaymentType[]> => {
    const params = includeInactive ? { includeInactive: 'true' } : {};
    const response = await apiClient.get<PaymentType[]>('/api/payment-types', { params });
    return response.data;
  },

  getById: async (id: string): Promise<PaymentType> => {
    const response = await apiClient.get<PaymentType>(`/api/payment-types/${id}`);
    return response.data;
  },

  create: async (data: CreatePaymentTypeRequest): Promise<PaymentType> => {
    const response = await apiClient.post<PaymentType>('/api/payment-types', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePaymentTypeRequest): Promise<PaymentType> => {
    const response = await apiClient.patch<PaymentType>(`/api/payment-types/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/payment-types/${id}`);
  },
};
