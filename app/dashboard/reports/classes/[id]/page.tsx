'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClassReport } from '@/lib/hooks/use-reports';
import { formatFullName } from '@/lib/utils/format';
import Link from 'next/link';
import { use, useState } from 'react';

export default function ClassReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const { data, isLoading, error } = useClassReport(id, undefined, page, limit);

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
            <p className="text-2xl font-bold">{report.studentCount}</p>
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

          {report.pagination && report.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {" "}
                {Math.min(page * limit, report.pagination.total)} of {" "}
                {report.pagination.total} students
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage((p) =>
                      Math.min(report.pagination!.totalPages, p + 1),
                    );
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={page === report.pagination!.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

