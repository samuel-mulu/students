'use client';

import { use } from 'react';
import { useStudentReport } from '@/lib/hooks/use-reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatDate, formatCurrency, formatFullName } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';

export default function StudentReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error } = useStudentReport(id);

  if (isLoading) {
    return <LoadingState rows={5} columns={2} />;
  }

  if (error || !data?.data) {
    return <ErrorState message="Failed to load student report" />;
  }

  const report = data.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Student Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {formatFullName(report.student.firstName, report.student.lastName)}
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="marks">Marks</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-sm">
                  {formatFullName(report.student.firstName, report.student.lastName)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm">{report.student.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Class Status</p>
                <Badge variant={report.student.classStatus === 'assigned' ? 'default' : 'secondary'}>
                  {report.student.classStatus}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                <Badge
                  variant={report.student.paymentStatus === 'confirmed' ? 'default' : 'secondary'}
                >
                  {report.student.paymentStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Days</p>
                <p className="text-2xl font-bold">{report.attendance.totalDays}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-green-600">
                  {report.attendance.presentDays}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold text-red-600">{report.attendance.absentDays}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold">
                  {report.attendance.attendanceRate.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marks Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Subject</th>
                      <th className="text-right p-2">Term 1</th>
                      <th className="text-right p-2">Term 2</th>
                      <th className="text-right p-2">Year Average</th>
                      <th className="text-right p-2">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.marks.map((mark) => (
                      <tr key={mark.subjectId} className="border-b">
                        <td className="p-2">{mark.subjectName}</td>
                        <td className="text-right p-2">
                          {mark.term1Total?.toFixed(2) || '-'}
                        </td>
                        <td className="text-right p-2">
                          {mark.term2Total?.toFixed(2) || '-'}
                        </td>
                        <td className="text-right p-2">
                          {mark.yearAverage?.toFixed(2) || '-'}
                        </td>
                        <td className="text-right p-2">
                          {mark.grade ? <Badge>{mark.grade}</Badge> : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Month/Year</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-center p-2">Status</th>
                      <th className="text-left p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.payments.map((payment) => (
                      <tr key={payment.id} className="border-b">
                        <td className="p-2">
                          {payment.month}/{payment.year}
                        </td>
                        <td className="text-right p-2">{formatCurrency(payment.amount)}</td>
                        <td className="text-center p-2">
                          <Badge
                            variant={payment.status === 'confirmed' ? 'default' : 'secondary'}
                          >
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {payment.paymentDate ? formatDate(payment.paymentDate) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

