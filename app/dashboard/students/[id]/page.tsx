'use client';

import { use, useState, useMemo } from 'react';
import { useStudent, useAssignClass, useTransferClass } from '@/lib/hooks/use-students';
import { usePayments } from '@/lib/hooks/use-payments';
import { useAttendance } from '@/lib/hooks/use-attendance';
import { useMarks } from '@/lib/hooks/use-marks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate, formatFullName, formatCurrency, formatMonthYear } from '@/lib/utils/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssignClassDialog } from '@/components/forms/AssignClassDialog';
import { TransferClassDialog } from '@/components/forms/TransferClassDialog';
import { useAuthStore } from '@/lib/store/auth-store';
import { BackButton } from '@/components/shared/BackButton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ImageViewerDialog } from '@/components/shared/ImageViewerDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ReceiptDialog } from '@/components/shared/ReceiptDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DollarSign, TrendingUp, FileText, Calendar, BookOpen, Award, CheckCircle2, XCircle, Clock, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuthStore();
  const [activeTab, setActiveTab] = useState('personal');
  const [assignDialog, setAssignDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [imageViewer, setImageViewer] = useState(false);
  const [receiptDialog, setReceiptDialog] = useState<{
    open: boolean;
    payment: any | null;
    payments?: any[];
  }>({
    open: false,
    payment: null,
  });
  const [proofImageViewer, setProofImageViewer] = useState<{
    open: boolean;
    imageUrl: string | null;
    transactionNumber?: string;
  }>({ open: false, imageUrl: null });

  // Fetch student basic info
  const { data, isLoading, error } = useStudent(id);
  
  // Fetch detailed data for tabs (only when tab is active)
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments(
    activeTab === 'payments' ? { studentId: id } : undefined
  );
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendance(
    activeTab === 'attendance' ? { studentId: id, limit: 40 } : undefined
  );
  const { data: marksData, isLoading: marksLoading } = useMarks(
    activeTab === 'marks' ? { studentId: id, limit: 40 } : undefined
  );

  const assignClass = useAssignClass();
  const transferClass = useTransferClass();

  // Process payments data (at top level to avoid hook order issues)
  const payments = useMemo(() => {
    if (!paymentsData?.data) return [];
    return Array.isArray(paymentsData.data) ? paymentsData.data : [];
  }, [paymentsData?.data]);

  const paymentsStats = useMemo(() => {
    const confirmedPayments = payments.filter(p => p.status === 'confirmed');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const totalPaid = confirmedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const paymentProgress = payments.length > 0 
      ? (confirmedPayments.length / payments.length) * 100 
      : 0;
    return { confirmedPayments, pendingPayments, totalPaid, totalPending, paymentProgress };
  }, [payments]);

  const monthlyPaymentData = useMemo(() => {
    const monthMap = new Map<string, { paid: number; pending: number }>();
    payments.forEach(payment => {
      // Normalize month to yyyy-MM format
      let monthKey: string;
      if (payment.month.includes('-')) {
        // Already in yyyy-MM format
        monthKey = payment.month;
      } else {
        // Convert month name to yyyy-MM format
        try {
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                             'July', 'August', 'September', 'October', 'November', 'December'];
          const monthIndex = monthNames.findIndex(m => m.toLowerCase() === payment.month.toLowerCase());
          if (monthIndex >= 0) {
            monthKey = `${payment.year}-${String(monthIndex + 1).padStart(2, '0')}`;
          } else {
            // Fallback: try parsing as date
            const date = new Date(`${payment.month} 1, ${payment.year}`);
            monthKey = format(date, 'yyyy-MM');
          }
        } catch {
          // Final fallback
          monthKey = `${payment.year}-${payment.month}`;
        }
      }
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { paid: 0, pending: 0 });
      }
      const monthData = monthMap.get(monthKey)!;
      if (payment.status === 'confirmed') {
        monthData.paid += payment.amount;
      } else {
        monthData.pending += payment.amount;
      }
    });
    return Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }, [payments]);

  const maxPaymentAmount = useMemo(() => {
    return monthlyPaymentData.length > 0
      ? Math.max(...monthlyPaymentData.map(m => m.paid + m.pending), 1)
      : 1;
  }, [monthlyPaymentData]);

  // Process attendance data
  const attendance = useMemo(() => {
    if (!attendanceData?.data) return [];
    return Array.isArray(attendanceData.data) ? attendanceData.data : [];
  }, [attendanceData?.data]);

  const attendanceStats = useMemo(() => {
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;
    const lateDays = attendance.filter(a => a.status === 'late').length;
    const attendanceRate = attendance.length > 0
      ? (presentDays / attendance.length) * 100
      : 0;
    return { presentDays, absentDays, lateDays, attendanceRate };
  }, [attendance]);

  const monthlyAttendanceData = useMemo(() => {
    const monthMap = new Map<string, { present: number; absent: number; late: number }>();
    attendance.forEach(record => {
      const date = new Date(record.date);
      const monthKey = format(date, 'yyyy-MM');
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { present: 0, absent: 0, late: 0 });
      }
      const monthData = monthMap.get(monthKey)!;
      if (record.status === 'present') monthData.present++;
      else if (record.status === 'absent') monthData.absent++;
      else if (record.status === 'late') monthData.late++;
    });
    return Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }, [attendance]);

  const maxAttendanceDays = useMemo(() => {
    return monthlyAttendanceData.length > 0
      ? Math.max(...monthlyAttendanceData.map(m => m.present + m.absent + m.late), 1)
      : 1;
  }, [monthlyAttendanceData]);

  // Process marks data
  const marks = useMemo(() => {
    if (!marksData?.data) return [];
    return Array.isArray(marksData.data) ? marksData.data : [];
  }, [marksData?.data]);

  const marksBySubject = useMemo(() => {
    const subjectMap = new Map<string, {
      subjectId: string;
      subjectName: string;
      marks: typeof marks;
      average: number;
    }>();
    
    marks.forEach(mark => {
      const subjectId = mark.subjectId;
      const subjectName = (mark as any).subject?.name || 'Unknown';
      
      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subjectId,
          subjectName,
          marks: [],
          average: 0,
        });
      }
      subjectMap.get(subjectId)!.marks.push(mark);
    });
    
    return Array.from(subjectMap.values()).map(subjectData => {
      const validMarks = subjectData.marks.filter(m => m.score !== undefined && m.maxScore !== undefined);
      const average = validMarks.length > 0
        ? validMarks.reduce((sum, m) => sum + (m.score / m.maxScore) * 100, 0) / validMarks.length
        : 0;
      return { ...subjectData, average };
    });
  }, [marks]);

  const marksStats = useMemo(() => {
    const overallAverage = marksBySubject.length > 0
      ? marksBySubject.reduce((sum, s) => sum + s.average, 0) / marksBySubject.length
      : 0;
    const highestSubject = marksBySubject.length > 0
      ? marksBySubject.reduce((max, s) => s.average > max.average ? s : max, marksBySubject[0])
      : null;
    return { overallAverage, highestSubject };
  }, [marksBySubject]);

  const maxMarksAverage = useMemo(() => {
    return marksBySubject.length > 0
      ? Math.max(...marksBySubject.map(s => s.average), 1)
      : 1;
  }, [marksBySubject]);

  if (isLoading) {
    return <LoadingState rows={5} columns={2} />;
  }

  if (error || !data?.data) {
    return <ErrorState message="Failed to load student details" />;
  }

  const student = data.data;

  const handleAssignClass = async (classId: string, reason: string) => {
    await assignClass.mutateAsync({
      id: student.id,
      data: { classId, reason },
    });
    setAssignDialog(false);
  };

  const handleTransferClass = async (newClassId: string, reason: string) => {
    await transferClass.mutateAsync({
      id: student.id,
      data: { newClassId, reason },
    });
    setTransferDialog(false);
  };

  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton href="/dashboard/students" />
          <div className="flex items-center gap-4">
            {/* Profile Image */}
            <button
              onClick={() => setImageViewer(true)}
              className="hover:opacity-80 transition-opacity cursor-pointer"
              title="View profile image"
            >
              <Avatar className="h-16 w-16">
                {student.profileImageUrl ? (
                  <AvatarImage src={student.profileImageUrl} alt={formatFullName(student.firstName, student.lastName)} />
                ) : null}
                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
            <div>
              <h1 className="text-xl font-semibold">{formatFullName(student.firstName, student.lastName)}</h1>
              <p className="text-sm text-muted-foreground mt-1">Student Details</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            <Badge variant={student.classStatus === 'assigned' ? 'default' : 'secondary'}>
              {student.classStatus}
            </Badge>
            <Badge variant={student.paymentStatus === 'confirmed' ? 'default' : 'secondary'}>
              {student.paymentStatus}
            </Badge>
          </div>
          {hasRole(['OWNER', 'REGISTRAR']) && (
            <div className="flex gap-2">
              {student.classStatus === 'new' && (
                <Button variant="outline" onClick={() => setAssignDialog(true)}>
                  Assign Class
                </Button>
              )}
              {student.classStatus === 'assigned' && hasRole(['OWNER']) && (
                <Button variant="outline" onClick={() => setTransferDialog(true)}>
                  Transfer Class
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="parent">Parent Information</TabsTrigger>
          <TabsTrigger value="medical">Medical Information</TabsTrigger>
          <TabsTrigger value="payments">
            <DollarSign className="mr-2 h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <Calendar className="mr-2 h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="marks">
            <BookOpen className="mr-2 h-4 w-4" />
            Marks
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">First Name</p>
                <p className="text-sm">{student.firstName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                <p className="text-sm">{student.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                <p className="text-sm">{formatDate(student.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gender</p>
                <p className="text-sm">{student.gender}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm">{student.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-sm">{student.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nationality</p>
                <p className="text-sm">{student.nationality || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Religion</p>
                <p className="text-sm">{student.religion || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p className="text-sm">{student.address}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">City</p>
                <p className="text-sm">{student.city}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">State</p>
                <p className="text-sm">{student.state || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Zip Code</p>
                <p className="text-sm">{student.zipCode || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Country</p>
                <p className="text-sm">{student.country || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parent/Guardian Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-sm">{student.parentName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Relation</p>
                <p className="text-sm">{student.parentRelation}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-sm">{student.parentPhone}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm">{student.parentEmail || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-sm">{student.emergencyName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Relation</p>
                <p className="text-sm">{student.emergencyRelation}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-sm">{student.emergencyPhone}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Blood Group</p>
                <p className="text-sm">{student.bloodGroup || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Allergies</p>
                <p className="text-sm">{student.allergies || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Medical Conditions</p>
                <p className="text-sm">{student.medicalConditions || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          {paymentsLoading ? (
            <LoadingState rows={5} columns={4} />
          ) : paymentsData?.data ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Total Payments</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {payments.length}
                        </p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Total Paid</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          {formatCurrency(paymentsStats.totalPaid)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-700">Pending Amount</p>
                        <p className="text-2xl font-bold text-orange-900 mt-1">
                          {formatCurrency(paymentsStats.totalPending)}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-indigo-200 bg-indigo-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-indigo-700">Payment Progress</p>
                        <p className="text-2xl font-bold text-indigo-900 mt-1">
                          {paymentsStats.paymentProgress.toFixed(1)}%
                        </p>
                        <div className="mt-2 w-full bg-indigo-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${paymentsStats.paymentProgress}%` }}
                          />
                        </div>
                      </div>
                      <TrendingUp className="h-8 w-8 text-indigo-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Payment Chart */}
              {monthlyPaymentData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Payment Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-end gap-2 h-64">
                        {monthlyPaymentData.map((monthData) => {
                          const paidHeight = (monthData.paid / maxPaymentAmount) * 100;
                          const pendingHeight = (monthData.pending / maxPaymentAmount) * 100;
                          // Parse month in yyyy-MM format
                          let monthDate: Date;
                          try {
                            const [year, month] = monthData.month.split('-');
                            monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                            if (isNaN(monthDate.getTime())) {
                              throw new Error('Invalid date');
                            }
                          } catch {
                            // Fallback to current date if parsing fails
                            monthDate = new Date();
                          }
                          
                          return (
                            <div key={monthData.month} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full flex flex-col justify-end h-full gap-0.5">
                                {monthData.paid > 0 && (
                                  <div
                                    className="bg-green-500 rounded-t"
                                    style={{ height: `${paidHeight}%` }}
                                    title={`Paid: ${formatCurrency(monthData.paid)}`}
                                  />
                                )}
                                {monthData.pending > 0 && (
                                  <div
                                    className="bg-orange-500 rounded-t"
                                    style={{ height: `${pendingHeight}%` }}
                                    title={`Pending: ${formatCurrency(monthData.pending)}`}
                                  />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 text-center transform -rotate-45 origin-top-left whitespace-nowrap">
                                {format(monthDate, 'MMM')}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-center gap-4 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-500 rounded"></div>
                          <span className="text-sm text-muted-foreground">Paid</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-orange-500 rounded"></div>
                          <span className="text-sm text-muted-foreground">Pending</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment History Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <EmptyState
                      title="No payments found"
                      description="No payment records for this student"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month/Year</TableHead>
                            <TableHead>Payment Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Payment Date</TableHead>
                            <TableHead>Receipt</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>
                                {formatMonthYear(payment.month, payment.year)}
                              </TableCell>
                              <TableCell>
                                {payment.paymentType?.name || 'N/A'}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(payment.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={payment.status === 'confirmed' ? 'default' : 'secondary'}
                                  className={
                                    payment.status === 'confirmed'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-orange-100 text-orange-800'
                                  }
                                >
                                  {payment.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {payment.paymentDate ? formatDate(payment.paymentDate) : '-'}
                              </TableCell>
                              <TableCell>
                                {payment.receipt?.receiptNumber ? (
                                  <span className="text-sm font-mono">
                                    {payment.receipt.receiptNumber}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {payment.receipt && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setReceiptDialog({
                                        open: true,
                                        payment,
                                      })}
                                    >
                                      View Receipt
                                    </Button>
                                  )}
                                  {payment.proofImageUrl && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setProofImageViewer({
                                        open: true,
                                        imageUrl: payment.proofImageUrl ? payment.proofImageUrl : null,
                                        transactionNumber: payment.transactionNumber,
                                      })}
                                      title="View Payment Proof"
                                    >
                                      <ImageIcon className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              title="No payment data"
              description="Unable to load payment information"
            />
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          {attendanceLoading ? (
            <LoadingState rows={5} columns={4} />
          ) : attendanceData?.data ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Total Days</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {attendance.length}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Present</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          {attendanceStats.presentDays}
                        </p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-700">Absent</p>
                        <p className="text-2xl font-bold text-red-900 mt-1">
                          {attendanceStats.absentDays}
                        </p>
                      </div>
                      <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-indigo-200 bg-indigo-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-indigo-700">Attendance Rate</p>
                        <p className="text-2xl font-bold text-indigo-900 mt-1">
                          {attendanceStats.attendanceRate.toFixed(1)}%
                        </p>
                        <div className="mt-2 w-full bg-indigo-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${attendanceStats.attendanceRate}%` }}
                          />
                        </div>
                      </div>
                      <TrendingUp className="h-8 w-8 text-indigo-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Attendance Chart */}
              {monthlyAttendanceData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Attendance Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-end gap-2 h-64">
                        {monthlyAttendanceData.map((monthData) => {
                          const presentHeight = (monthData.present / maxAttendanceDays) * 100;
                          const absentHeight = (monthData.absent / maxAttendanceDays) * 100;
                          const lateHeight = (monthData.late / maxAttendanceDays) * 100;
                          // Parse month in yyyy-MM format
                          let monthDate: Date;
                          try {
                            const [year, month] = monthData.month.split('-');
                            monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                            if (isNaN(monthDate.getTime())) {
                              throw new Error('Invalid date');
                            }
                          } catch {
                            // Fallback to current date if parsing fails
                            monthDate = new Date();
                          }
                          
                          return (
                            <div key={monthData.month} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full flex flex-col justify-end h-full gap-0.5">
                                {monthData.present > 0 && (
                                  <div
                                    className="bg-green-500 rounded-t"
                                    style={{ height: `${presentHeight}%` }}
                                    title={`Present: ${monthData.present}`}
                                  />
                                )}
                                {monthData.late > 0 && (
                                  <div
                                    className="bg-yellow-500"
                                    style={{ height: `${lateHeight}%` }}
                                    title={`Late: ${monthData.late}`}
                                  />
                                )}
                                {monthData.absent > 0 && (
                                  <div
                                    className="bg-red-500 rounded-t"
                                    style={{ height: `${absentHeight}%` }}
                                    title={`Absent: ${monthData.absent}`}
                                  />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 text-center transform -rotate-45 origin-top-left whitespace-nowrap">
                                {format(monthDate, 'MMM')}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-center gap-4 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-500 rounded"></div>
                          <span className="text-sm text-muted-foreground">Present</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                          <span className="text-sm text-muted-foreground">Late</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-red-500 rounded"></div>
                          <span className="text-sm text-muted-foreground">Absent</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Attendance History Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance History</CardTitle>
                </CardHeader>
                <CardContent>
                  {attendance.length === 0 ? (
                    <EmptyState
                      title="No attendance records"
                      description="No attendance data for this student"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendance.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">
                                {formatDate(record.date)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={record.status === 'present' ? 'default' : 'secondary'}
                                  className={
                                    record.status === 'present'
                                      ? 'bg-green-100 text-green-800'
                                      : record.status === 'late'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }
                                >
                                  {record.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {(record as any).class?.name || '-'}
                              </TableCell>
                              <TableCell>
                                {record.notes || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              title="No attendance data"
              description="Unable to load attendance information"
            />
          )}
        </TabsContent>

        {/* Marks Tab */}
        <TabsContent value="marks" className="space-y-4">
          {marksLoading ? (
            <LoadingState rows={5} columns={4} />
          ) : marksData?.data ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Total Subjects</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {marksBySubject.length}
                        </p>
                      </div>
                      <BookOpen className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Average Score</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          {marksStats.overallAverage.toFixed(1)}%
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-700">Highest Subject</p>
                        <p className="text-lg font-bold text-purple-900 mt-1">
                          {marksStats.highestSubject ? `${marksStats.highestSubject.subjectName}` : 'N/A'}
                        </p>
                        <p className="text-sm text-purple-600">
                          {marksStats.highestSubject ? `${marksStats.highestSubject.average.toFixed(1)}%` : ''}
                        </p>
                      </div>
                      <Award className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-indigo-200 bg-indigo-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-indigo-700">Total Marks</p>
                        <p className="text-2xl font-bold text-indigo-900 mt-1">
                          {marks.length}
                        </p>
                      </div>
                      <FileText className="h-8 w-8 text-indigo-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Marks by Subject Chart */}
              {marksBySubject.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Average Score by Subject</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-end gap-2 h-64">
                        {marksBySubject.map((subjectData) => {
                          const height = (subjectData.average / maxMarksAverage) * 100;
                          
                          return (
                            <div key={subjectData.subjectId} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full flex flex-col justify-end h-full">
                                <div
                                  className="bg-indigo-500 rounded-t"
                                  style={{ height: `${height}%` }}
                                  title={`${subjectData.subjectName}: ${subjectData.average.toFixed(1)}%`}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 text-center transform -rotate-45 origin-top-left whitespace-nowrap max-w-[60px] truncate">
                                {subjectData.subjectName}
                              </p>
                              <p className="text-xs font-semibold mt-1">
                                {subjectData.average.toFixed(0)}%
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Marks History Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Marks History</CardTitle>
                </CardHeader>
                <CardContent>
                  {marks.length === 0 ? (
                    <EmptyState
                      title="No marks found"
                      description="No marks recorded for this student"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead>Term</TableHead>
                            <TableHead>Sub-Exam</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead className="text-right">Max Score</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {marks.map((mark) => {
                            const subjectName = (mark as any).subject?.name || 'Unknown';
                            const termName = (mark as any).term?.name || 'Unknown';
                            const subExamName = (mark as any).subExam?.name || 'Unknown';
                            
                            return (
                              <TableRow key={mark.id}>
                                <TableCell className="font-medium">
                                  {subjectName}
                                </TableCell>
                                <TableCell>{termName}</TableCell>
                                <TableCell>{subExamName}</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {mark.score.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {mark.maxScore.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  {mark.grade ? (
                                    <Badge>{mark.grade}</Badge>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                <TableCell>
                                  {formatDate(mark.createdAt)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              title="No marks data"
              description="Unable to load marks information"
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Previous School Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Previous School</p>
                <p className="text-sm">{student.previousSchool || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Previous Class</p>
                <p className="text-sm">{student.previousClass || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Transfer Reason</p>
                <p className="text-sm">{student.transferReason || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AssignClassDialog
        open={assignDialog}
        onOpenChange={setAssignDialog}
        student={student}
        onConfirm={handleAssignClass}
        isLoading={assignClass.isPending}
      />

      <TransferClassDialog
        open={transferDialog}
        onOpenChange={setTransferDialog}
        student={student}
        onConfirm={handleTransferClass}
        isLoading={transferClass.isPending}
      />

      {/* Image Viewer Dialog */}
      <ImageViewerDialog
        open={imageViewer}
        onOpenChange={setImageViewer}
        imageUrl={student.profileImageUrl}
        firstName={student.firstName}
        lastName={student.lastName}
      />

      {/* Receipt Dialog */}
      <ReceiptDialog
        open={receiptDialog.open}
        onOpenChange={(open) => setReceiptDialog({ open, payment: receiptDialog.payment })}
        payment={receiptDialog.payment}
      />

      {/* Proof Image Viewer */}
      {proofImageViewer.imageUrl && (
        <Dialog open={proofImageViewer.open} onOpenChange={(open) => setProofImageViewer({ open, imageUrl: null })}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payment Proof</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <img
                  src={proofImageViewer.imageUrl}
                  alt="Payment proof"
                  className="max-w-full max-h-[70vh] rounded-lg object-contain"
                />
              </div>
              {proofImageViewer.transactionNumber && (
                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Transaction Number</p>
                  <p className="font-mono font-semibold text-lg">{proofImageViewer.transactionNumber}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

