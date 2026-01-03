import apiClient from './client';
import {
  PromotionPreview,
  PromotionResult
} from '@/lib/types';

export const promotionApi = {
  getPreview: async (): Promise<PromotionPreview> => {
    const response = await apiClient.get<PromotionPreview>('/api/promotion/preview');
    return response.data;
  },

  execute: async (): Promise<PromotionResult> => {
    const response = await apiClient.post<PromotionResult>('/api/promotion/execute');
    return response.data;
  },
};


