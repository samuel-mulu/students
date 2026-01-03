import apiClient from './client';
import {
  SystemSettings,
  UpdateSettingRequest
} from '@/lib/types';

export const settingsApi = {
  getAll: async (): Promise<SystemSettings[]> => {
    const response = await apiClient.get<SystemSettings[]>('/api/settings');
    return response.data;
  },

  getByKey: async (key: string): Promise<SystemSettings> => {
    const response = await apiClient.get<SystemSettings>(`/api/settings/${key}`);
    return response.data;
  },

  update: async (key: string, data: UpdateSettingRequest): Promise<SystemSettings> => {
    const response = await apiClient.patch<SystemSettings>(`/api/settings/${key}`, data);
    return response.data;
  },
};


