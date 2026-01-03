import apiClient from './client';
import {
  PromotionPreview,
  PromotionResult,
  ApiResponse,
} from '@/lib/types';

export const promotionApi = {
  getPreview: async (): Promise<PromotionPreview> => {
    const response = await apiClient.get<ApiResponse<PromotionPreview>>('/api/promotion/preview');
    return response.data as PromotionPreview;
  },

  execute: async (): Promise<PromotionResult> => {
    const response = await apiClient.post<ApiResponse<PromotionResult>>('/api/promotion/execute');
    return response.data as PromotionResult;
  },
};

