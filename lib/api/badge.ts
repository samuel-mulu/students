import apiClient from './client';

export interface BadgeData {
  student: {
    id: string;
    studentNumber: number | null;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    profileImageUrl: string | null;
    emergencyPhone: string;
  };
  class: {
    name: string;
    grade?: {
      name: string;
    };
  } | null;
  academicYear: {
    name: string;
  } | null;
  school: {
    name: string;
    contactNumber: string;
    logoUrl: string | null;
  };
}

export const badgeApi = {
  getPreview: async (studentId: string): Promise<BadgeData> => {
    const response = await apiClient.get<BadgeData>(`/api/badge/${studentId}/preview`);
    return response.data;
  },

  downloadBadge: async (
    studentId: string,
    format: 'pdf' | 'png' = 'pdf',
    side: 'front' | 'back' | 'combined' = 'combined',
    minimal: boolean = false,
    photoStyle: 'square' | 'rounded' | 'circle' = 'square'
  ): Promise<Blob> => {
    const response = await apiClient.get(
      `/api/badge/${studentId}?format=${format}&side=${side}${minimal ? '&minimal=true' : ''}&photoStyle=${photoStyle}`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },
};
