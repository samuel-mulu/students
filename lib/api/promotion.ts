import apiClient from './client';
import {
  PromotionPreview,
  PromotionPreviewParams,
  PromotionResult
} from '@/lib/types';

export const promotionApi = {
  getPreview: async (params?: PromotionPreviewParams): Promise<PromotionPreview> => {
    const response = await apiClient.get<PromotionPreview>('/api/promotion/preview', {
      params: {
        classId: params?.classId,
        includeStudents: params?.includeStudents === false ? 'false' : undefined,
      },
      timeout: 120000,
    });
    return response.data;
  },

  execute: async (): Promise<PromotionResult> => {
    const response = await apiClient.post<PromotionResult>('/api/promotion/execute', undefined, {
      timeout: 120000,
    });
    return response.data;
  },
};


