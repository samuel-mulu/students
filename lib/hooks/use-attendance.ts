import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api/attendance';
import {
  CreateAttendanceRequest,
  BulkAttendanceRequest,
  UpdateAttendanceRequest,
} from '@/lib/types';

export function useAttendance(params?: {
  studentId?: string;
  classId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['attendance', params],
    queryFn: async () => {
      const attendance = await attendanceApi.getAll(params);
      return { data: attendance };
    },
  });
}

export function useAttendanceByClass(classId: string, date: string) {
  return useQuery({
    queryKey: ['attendance', 'class', classId, date],
    queryFn: async () => {
      const attendance = await attendanceApi.getByClass(classId, date);
      return { data: attendance };
    },
    enabled: !!classId && !!date,
  });
}

export function useBulkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkAttendanceRequest) => attendanceApi.createBulk(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({
        queryKey: ['attendance', 'class', variables.classId, variables.date],
      });
    },
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAttendanceRequest }) =>
      attendanceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

