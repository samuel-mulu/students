import apiClient from './client';
import {
  SystemSettings,
  UpdateSettingRequest,
  ApiResponse,
} from '@/lib/types';

export const settingsApi = {
  getAll: async (): Promise<SystemSettings[]> => {
    const response = await apiClient.get<ApiResponse<SystemSettings[]>>('/api/settings');
    return response.data as SystemSettings[];
  },

  getByKey: async (key: string): Promise<SystemSettings> => {
    const response = await apiClient.get<ApiResponse<SystemSettings>>(`/api/settings/${key}`);
    return response.data as SystemSettings;
  },

  update: async (key: string, data: UpdateSettingRequest): Promise<SystemSettings> => {
    const response = await apiClient.patch<ApiResponse<SystemSettings>>(`/api/settings/${key}`, data);
    return response.data as SystemSettings;
  },
};

