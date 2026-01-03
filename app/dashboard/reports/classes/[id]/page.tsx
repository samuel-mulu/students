'use client';

import { use } from 'react';
import { useClassReport } from '@/lib/hooks/use-reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatFullName } from '@/lib/utils/format';
import Link from 'next/link';

export default function ClassReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error } = useClassReport(id);

  if (isLoading) {
    return <LoadingState rows={5} columns={4} />;
  }

  if (error || !data?.data) {
    return <ErrorState message="Failed to load class report" />;
  }

  const report = data.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Class Report</h1>
        <p className="text-sm text-muted-foreground mt-1">{report.class.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.students.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {report.attendance.averageAttendanceRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.marks.averageScore.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-center p-2">Class Status</th>
                </tr>
              </thead>
              <tbody>
                {report.students.map((student) => (
                  <tr key={student.id} className="border-b">
                    <td className="p-2">
                      <Link
                        href={`/dashboard/students/${student.id}`}
                        className="hover:underline"
                      >
                        {formatFullName(student.firstName, student.lastName)}
                      </Link>
                    </td>
                    <td className="p-2">{student.email || '-'}</td>
                    <td className="text-center p-2">{student.classStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

