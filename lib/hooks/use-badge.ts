import { badgeApi } from '@/lib/api/badge';
import { useQuery } from '@tanstack/react-query';

export function useBadgePreview(studentId: string) {
  return useQuery({
    queryKey: ['badge', 'preview', studentId],
    queryFn: async () => {
      const data = await badgeApi.getPreview(studentId);
      return { data };
    },
    enabled: !!studentId,
  });
}

export function useDownloadBadge() {
  return {
    download: async (
      studentId: string,
      format: 'pdf' | 'png' = 'pdf',
      side: 'front' | 'back' | 'combined' = 'combined',
      minimal: boolean = false
    ) => {
      const blob = await badgeApi.downloadBadge(studentId, format, side, minimal);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const extension = format === 'pdf' ? 'pdf' : 'png';
      const sideName = side === 'combined' ? 'combined' : side;
      link.download = `badge-${studentId}-${sideName}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  };
}
