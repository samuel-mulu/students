import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api/attendance';
import {
  CreateAttendanceRequest,
  BulkAttendanceRequest,
  UpdateAttendanceRequest,
} from '@/lib/types';
import { toast } from 'sonner';

export function useAttendance(params?: {
  studentId?: string;
  classId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
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

export function useClassAttendanceDates(classId: string) {
  return useQuery({
    queryKey: ['attendance', 'class', classId, 'dates'],
    queryFn: async () => {
      const dates = await attendanceApi.getClassDates(classId);
      return { data: dates };
    },
    enabled: !!classId,
    staleTime: 1000, // Consider data stale after 1 second
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

export function useClassAttendanceSummary(classId: string) {
  return useQuery({
    queryKey: ['attendance', 'class', classId, 'summary'],
    queryFn: async () => {
      const summary = await attendanceApi.getClassSummary(classId);
      return { data: summary };
    },
    enabled: !!classId,
    staleTime: 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useBulkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkAttendanceRequest) => attendanceApi.createBulk(data),
    onSuccess: (result, variables) => {
      // Invalidate all attendance queries
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      // Specifically invalidate the dates query to ensure it refreshes
      queryClient.invalidateQueries({
        queryKey: ['attendance', 'class', variables.classId, 'dates'],
      });
      // Invalidate the specific date query
      queryClient.invalidateQueries({
        queryKey: ['attendance', 'class', variables.classId, variables.date],
      });
      // Force refetch the dates query
      queryClient.refetchQueries({
        queryKey: ['attendance', 'class', variables.classId, 'dates'],
      });
      const count = variables.attendanceData.length;
      toast.success("Attendance Recorded", {
        description: `Attendance for ${count} student${count > 1 ? 's' : ''} has been recorded.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to record attendance. Please try again.";
      toast.error("Record Attendance Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAttendanceRequest }) =>
      attendanceApi.update(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      // Invalidate specific class and date queries
      queryClient.invalidateQueries({
        queryKey: ['attendance', 'class'],
      });
      queryClient.invalidateQueries({
        queryKey: ['attendance', 'class', 'dates'],
      });
      toast.success("Attendance Updated", {
        description: "Attendance record has been successfully updated.",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.errorMessage || 
                          error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          "Failed to update attendance. Please try again.";
      toast.error("Update Attendance Failed", {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

