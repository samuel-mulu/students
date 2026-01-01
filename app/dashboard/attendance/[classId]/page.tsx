'use client';

import { use, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useClass } from '@/lib/hooks/use-classes';
import { useStudents } from '@/lib/hooks/use-students';
import { useAttendanceByClass, useBulkAttendance } from '@/lib/hooks/use-attendance';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { AttendanceStatus } from '@/lib/types';
import { formatFullName, formatDate } from '@/lib/utils/format';
import { Check, X, Clock } from 'lucide-react';

export default function AttendanceBulkPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const searchParams = useSearchParams();
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const { data: classData, isLoading: classLoading } = useClass(classId);
  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    classId,
    classStatus: 'assigned',
  });
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceByClass(classId, date);
  const bulkAttendance = useBulkAttendance();

  const [attendanceStates, setAttendanceStates] = useState<Record<string, AttendanceStatus>>({});

  // Initialize attendance states from existing data or default to 'present'
  useMemo(() => {
    if (attendanceData?.data && studentsData?.data) {
      const states: Record<string, AttendanceStatus> = {};
      studentsData.data.forEach((student) => {
        const existing = attendanceData.data.find((a) => a.studentId === student.id);
        states[student.id] = existing?.status || 'present';
      });
      setAttendanceStates(states);
    } else if (studentsData?.data) {
      const states: Record<string, AttendanceStatus> = {};
      studentsData.data.forEach((student) => {
        states[student.id] = 'present';
      });
      setAttendanceStates(states);
    }
  }, [attendanceData, studentsData]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceStates((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (studentsData?.data) {
      const states: Record<string, AttendanceStatus> = {};
      studentsData.data.forEach((student) => {
        states[student.id] = status;
      });
      setAttendanceStates(states);
    }
  };

  const handleSave = async () => {
    if (!studentsData?.data) return;

    const attendanceData = studentsData.data.map((student) => ({
      studentId: student.id,
      status: attendanceStates[student.id] || 'present',
      notes: '',
    }));

    await bulkAttendance.mutateAsync({
      classId,
      date,
      attendanceData,
    });
  };

  if (classLoading || studentsLoading || attendanceLoading) {
    return <LoadingState rows={10} columns={3} />;
  }

  if (!classData?.data || !studentsData?.data) {
    return <ErrorState message="Failed to load class or students" />;
  }

  const students = Array.isArray(studentsData.data) ? studentsData.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Mark Attendance</h1>
        <p className="text-body text-muted-foreground mt-1">
          {classData.data.name} - {formatDate(date)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleMarkAll('present')}>
              <Check className="mr-2 h-4 w-4" />
              Mark All Present
            </Button>
            <Button variant="outline" onClick={() => handleMarkAll('absent')}>
              <X className="mr-2 h-4 w-4" />
              Mark All Absent
            </Button>
            <Button variant="outline" onClick={() => handleMarkAll('late')}>
              <Clock className="mr-2 h-4 w-4" />
              Mark All Late
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Students ({students.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {formatFullName(student.firstName, student.lastName)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={attendanceStates[student.id] || 'present'}
                        onValueChange={(value) =>
                          handleStatusChange(student.id, value as AttendanceStatus)
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              Present
                            </div>
                          </SelectItem>
                          <SelectItem value="absent">
                            <div className="flex items-center gap-2">
                              <X className="h-4 w-4 text-red-600" />
                              Absent
                            </div>
                          </SelectItem>
                          <SelectItem value="late">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-yellow-600" />
                              Late
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={bulkAttendance.isPending} size="lg">
          {bulkAttendance.isPending ? 'Saving...' : 'Save Attendance'}
        </Button>
      </div>
    </div>
  );
}

