import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';

export function useStudentReport(studentId: string) {
  return useQuery({
    queryKey: ['reports', 'student', studentId],
    queryFn: async () => {
      const report = await reportsApi.getStudentReport(studentId);
      return { data: report };
    },
    enabled: !!studentId,
  });
}

export function useClassReport(classId: string) {
  return useQuery({
    queryKey: ['reports', 'class', classId],
    queryFn: async () => {
      const report = await reportsApi.getClassReport(classId);
      return { data: report };
    },
    enabled: !!classId,
  });
}

