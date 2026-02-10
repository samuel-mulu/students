import { badgeApi } from '@/lib/api/badge';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateBadgePDFClient } from '../utils/badge-generator';

export function useBadgePreview(studentId: string) {
  return useQuery({
    queryKey: ['badge', 'preview', studentId],
    queryFn: async () => {
      console.log(`[useBadge] Fetching preview for student: ${studentId}`);
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
      console.log(`[useBadge] Download triggered: ${format}, side: ${side}, student: ${studentId}`);
      
      try {
        if (format === 'pdf') {
          console.log('[useBadge] Generating PDF on client-side...');
          const previewResponse = await badgeApi.getPreview(studentId);
          console.log('[useBadge] Preview data received, calling generator');
          await generateBadgePDFClient(previewResponse, side, minimal);
          console.log('[useBadge] Client-side PDF generation finished');
          return;
        }

        console.log(`[useBadge] Requesting ${format} from backend...`);
        // For PNG, keep the backend implementation for now
        const blob = await badgeApi.downloadBadge(studentId, format, side, minimal);
        console.log(`[useBadge] ${format} blob received from backend`);
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const extension = format;
        const sideName = side === 'combined' ? 'combined' : side;
        link.download = `badge-${studentId}-${sideName}.${extension}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log(`[useBadge] ${format} download initiated`);
      } catch (error: any) {
        console.error('[useBadge] Download failed:', error);
        toast.error('Download failed', {
          description: error.message || 'An unexpected error occurred'
        });
      }
    },
  };
}
