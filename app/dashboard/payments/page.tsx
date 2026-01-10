'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStudents } from '@/lib/hooks/use-students';
import { useClasses } from '@/lib/hooks/use-classes';
import { useAcademicYears, useActiveAcademicYear } from '@/lib/hooks/use-academicYears';
import { useGrades } from '@/lib/hooks/use-grades';
import { usePayments, useCreatePayment, useConfirmPayment } from '@/lib/hooks/use-payments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { PaymentDialog } from '@/components/forms/PaymentDialog';
import { ReceiptDialog } from '@/components/shared/ReceiptDialog';
import { Student, Payment, CreatePaymentRequest } from '@/lib/types';
import { generateMonthsFromAcademicYear, hasPaymentForMonth } from '@/lib/utils/format';
import { useAuthStore } from '@/lib/store/auth-store';
import { CheckCircle2, DollarSign, FileText } from 'lucide-react';

export default function PaymentsPage() {
  const { user, hasRole } = useAuthStore();
  const isOwner = user?.role === 'OWNER';
  const isTeacherOrRegistrar = user?.role === 'TEACHER' || user?.role === 'REGISTRAR';

  // Filters state
  const [search, setSearch] = useState<string>('');
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [showGradeClasses, setShowGradeClasses] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    student: Student | null;
  }>({
    open: false,
    student: null,
  });
  const [receiptDialog, setReceiptDialog] = useState<{
    open: boolean;
    payment: Payment | null;
  }>({
    open: false,
    payment: null,
  });

  // Data hooks
  const { data: classesData } = useClasses();
  const { data: academicYearsData } = useAcademicYears();
  const { data: activeYearData } = useActiveAcademicYear();
  const { data: gradesData } = useGrades();

  const academicYears = Array.isArray(academicYearsData?.data) ? academicYearsData.data : [];
  const grades = Array.isArray(gradesData?.data) ? gradesData.data : [];
  const allClasses = Array.isArray(classesData?.data) ? classesData.data : [];

  // Set default academic year to active for Teacher/Registrar, or latest for OWNER
  useEffect(() => {
    if (!academicYearFilter && academicYears.length > 0) {
      if (isTeacherOrRegistrar && activeYearData?.data?.id) {
        setAcademicYearFilter(activeYearData.data.id);
      } else if (isOwner) {
        // For OWNER, use active year if available, otherwise latest
        if (activeYearData?.data?.id) {
          setAcademicYearFilter(activeYearData.data.id);
        } else {
          const latest = academicYears.sort(
            (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          )[0];
          if (latest) {
            setAcademicYearFilter(latest.id);
          }
        }
      }
    }
  }, [academicYears, activeYearData, academicYearFilter, isOwner, isTeacherOrRegistrar]);

  // Get selected academic year
  const selectedAcademicYear = useMemo(() => {
    return academicYears.find((year) => year.id === academicYearFilter) || null;
  }, [academicYears, academicYearFilter]);

  // Generate months from selected academic year
  const monthOptions = useMemo(() => {
    if (!selectedAcademicYear) return [];
    return generateMonthsFromAcademicYear(
      selectedAcademicYear.startDate,
      selectedAcademicYear.endDate ?? null
    );
  }, [selectedAcademicYear]);

  // Set default month when months are generated
  useEffect(() => {
    if (monthOptions.length > 0 && !monthFilter) {
      // Default to current month if within academic year, otherwise first month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const hasCurrentMonth = monthOptions.some((m) => m.value === currentMonth);
      setMonthFilter(hasCurrentMonth ? currentMonth : monthOptions[0].value);
    }
  }, [monthOptions, monthFilter]);

  // Filter classes by academic year
  const classesByAcademicYear = useMemo(() => {
    if (!academicYearFilter) return allClasses;
    return allClasses.filter(
      (cls) =>
        cls.academicYearId === academicYearFilter ||
        (typeof cls.academicYear === 'object' && cls.academicYear?.id === academicYearFilter) ||
        cls.academicYear === academicYearFilter
    );
  }, [allClasses, academicYearFilter]);

  // Get classes for selected grade
  const gradeClasses = useMemo(() => {
    if (gradeFilter === 'all' || !academicYearFilter) return [];
    return classesByAcademicYear.filter((cls) => cls.gradeId === gradeFilter);
  }, [classesByAcademicYear, gradeFilter, academicYearFilter]);

  // Reset grade and class filters when academic year changes
  useEffect(() => {
    if (academicYearFilter) {
      setGradeFilter('all');
      setClassFilter('all');
      setShowGradeClasses(false);
    }
  }, [academicYearFilter]);

  // Fetch students based on filters
  const { data: studentsData, isLoading: studentsLoading, error: studentsError, refetch: refetchStudents } = useStudents({
    classId: classFilter !== 'all' ? classFilter : undefined,
    classStatus: 'assigned', // Only show assigned students
  });

  // Fetch payments for all students (we'll filter client-side by month)
  // Don't filter by month on backend to ensure we have all payments for status checking
  const { data: paymentsData, isLoading: paymentsLoading, refetch: refetchPayments } = usePayments();

  const createPayment = useCreatePayment();
  const confirmPayment = useConfirmPayment();

  const students = Array.isArray(studentsData?.data) ? studentsData.data : [];
  const payments = Array.isArray(paymentsData?.data) ? paymentsData.data : [];

  // Helper to remove academic year from class name
  const removeAcademicYearFromClassName = (className: string): string => {
    return className.replace(/\s*\([^)]*\)\s*$/, '').trim();
  };

  // Filter students by grade/class
  const filteredStudents = useMemo(() => {
    let result = students;

    // If grade is selected but no specific class, filter by grade classes
    if (gradeFilter !== 'all' && classFilter === 'all' && gradeClasses.length > 0) {
      const gradeClassIds = new Set(gradeClasses.map((cls) => cls.id));
      result = result.filter((student: Student) => {
        let studentClassId: string | null = null;
        if ('classHistory' in student && Array.isArray(student.classHistory)) {
          const activeClass = student.classHistory.find((ch: any) => !ch.endDate);
          if (activeClass) {
            studentClassId =
              activeClass.class?.id ||
              activeClass.classId ||
              (typeof activeClass.class === 'string' ? activeClass.class : null);
          }
        }
        return studentClassId && gradeClassIds.has(studentClassId);
      });
    }

    // If specific class is selected, filter by that class
    if (classFilter !== 'all') {
      result = result.filter((student: Student) => {
        let studentClassId: string | null = null;
        if ('classHistory' in student && Array.isArray(student.classHistory)) {
          const activeClass = student.classHistory.find((ch: any) => !ch.endDate);
          if (activeClass) {
            studentClassId =
              activeClass.class?.id ||
              activeClass.classId ||
              (typeof activeClass.class === 'string' ? activeClass.class : null);
          }
        }
        return studentClassId === classFilter;
      });
    }

    // Filter by payment status if month is selected
    if (statusFilter !== 'all' && monthFilter) {
      const year = monthFilter ? parseInt(monthFilter.split('-')[0]) : undefined;
      result = result.filter((student: Student) => {
        const studentPayments = payments.filter((p: Payment) => p.studentId === student.id);
        const paymentInfo = hasPaymentForMonth(studentPayments, monthFilter, year);
        if (statusFilter === 'confirmed') {
          return paymentInfo.exists && paymentInfo.status === 'confirmed';
        } else if (statusFilter === 'pending') {
          return !paymentInfo.exists || paymentInfo.status === 'pending';
        }
        return true;
      });
    }

    // Sort by name (always sort by name when filtered by class)
    return result.sort((a, b) => {
      return (a.firstName || '').localeCompare(b.firstName || '');
    });
  }, [students, gradeFilter, classFilter, gradeClasses, statusFilter, monthFilter, payments]);

  // Check if filters are fully applied (class is selected, meaning we have a specific filtered list)
  const isFullyFiltered =
    classFilter !== 'all' || (academicYearFilter && gradeFilter !== 'all');

  // Apply search filter (text search and number search like students page)
  const finalStudents = useMemo(() => {
    // Check if search is a number and filters are fully applied
    const searchAsNumber = parseInt(search.trim());
    const isNumberSearch =
      !isNaN(searchAsNumber) && search.trim() !== '' && isFullyFiltered;

    if (isNumberSearch && searchAsNumber > 0) {
      // Find student at that position (1-indexed)
      const studentIndex = searchAsNumber - 1;
      if (studentIndex >= 0 && studentIndex < filteredStudents.length) {
        return [filteredStudents[studentIndex]];
      }
      // If number is out of range, return empty array
      return [];
    }

    // If search is not a number or filters not fully applied, use text search on sorted list
    if (search.trim() === '') {
      return filteredStudents;
    }

    // Apply text search on already sorted and filtered students
    const searchLower = search.toLowerCase();
    return filteredStudents.filter((student: Student) => {
      return (
        student.firstName.toLowerCase().includes(searchLower) ||
        student.lastName.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower) ||
        student.phone?.toLowerCase().includes(searchLower)
      );
    });
  }, [filteredStudents, search, isFullyFiltered]);

  // Get payment status for a student
  const getStudentPaymentStatus = (student: Student): { paid: boolean; payment?: Payment } => {
    if (!monthFilter) return { paid: false };
    const year = parseInt(monthFilter.split('-')[0]);
    const studentPayments = payments.filter((p: Payment) => p.studentId === student.id);
    const paymentInfo = hasPaymentForMonth(studentPayments, monthFilter, year);
    if (paymentInfo.exists && paymentInfo.status === 'confirmed') {
      // Find the payment that matches the month and year, and includes receipt
      const payment = studentPayments.find(
        (p: Payment) => p.month === monthFilter && p.year === year && p.status === 'confirmed'
      );
      return { paid: true, payment };
    }
    return { paid: false };
  };

  const handleCreatePayment = async (data: CreatePaymentRequest) => {
    try {
      // Create payment
      const payment = await createPayment.mutateAsync(data);
      // Auto-confirm the payment immediately since it's being created as paid
      // This will automatically generate receipt in the backend
      if (payment?.id) {
        const confirmedPayment = await confirmPayment.mutateAsync({ 
          id: payment.id,
          data: {
            paymentDate: new Date().toISOString(),
            paymentMethod: data.paymentMethod || 'cash',
          }
        });
        
        // Close payment dialog
        setPaymentDialog({ open: false, student: null });
        
        // Refetch payments and students to update the UI
        // The mutations already invalidate queries, but we refetch to ensure UI updates
        await Promise.all([refetchPayments(), refetchStudents()]);
        
        // Show receipt dialog after payment is confirmed
        // The confirmedPayment should already include receipt from backend
        if (confirmedPayment?.receipt) {
          setReceiptDialog({ open: true, payment: confirmedPayment });
        }
      }
    } catch (error) {
      // Error is already handled by the mutation hooks
      console.error('Error creating/confirming payment:', error);
    }
  };

  const isLoading = studentsLoading || paymentsLoading;
  const error = studentsError;

  if (isLoading) {
    return <LoadingState rows={5} columns={6} />;
  }

  if (error) {
    return <ErrorState message="Failed to load payments" onRetry={() => refetchStudents()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student payments by grade and section
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Search Bar */}
            <Input
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Academic Year Filter - Smaller */}
            {isTeacherOrRegistrar ? (
              <Input
                value={selectedAcademicYear?.name || 'Loading...'}
                disabled
                className="bg-muted text-sm h-9"
              />
            ) : (
              <Select
                value={academicYearFilter}
                onValueChange={(value) => {
                  setAcademicYearFilter(value);
                  setGradeFilter('all');
                  setClassFilter('all');
                  setShowGradeClasses(false);
                }}
              >
                <SelectTrigger className="text-sm h-9">
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id} className="text-sm">
                      {year.name}
                      {activeYearData?.data?.id === year.id && ' (Active)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Grade Filter */}
            <Select
              value={gradeFilter}
              onValueChange={(value) => {
                setGradeFilter(value);
                setClassFilter('all');
                setShowGradeClasses(value !== 'all');
              }}
              disabled={!academicYearFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {grades.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Payment Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Paid</SelectItem>
                <SelectItem value="pending">Unpaid</SelectItem>
              </SelectContent>
            </Select>

            {/* Month Filter */}
            <Select
              value={monthFilter}
              onValueChange={setMonthFilter}
              disabled={!selectedAcademicYear || monthOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section/Class Filter - appears after grade selection */}
          {showGradeClasses && gradeFilter !== 'all' && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-xs text-gray-400 font-medium mb-2 block">
                Sections/Classes for Selected Grade
              </Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full md:w-auto">
                  <SelectValue placeholder="Select Section/Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes in Grade</SelectItem>
                  {gradeClasses.length > 0 ? (
                    gradeClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {removeAcademicYearFromClassName(cls.name)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No classes found for this grade
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {finalStudents.length === 0 ? (
        <EmptyState
          title="No students found"
          description="Adjust your filters to see students"
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">NO</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finalStudents.map((student: Student, index: number) => {
                const paymentStatus = getStudentPaymentStatus(student);
                const activeClass = 'classHistory' in student && Array.isArray(student.classHistory)
                  ? student.classHistory.find((ch: any) => !ch.endDate)
                  : null;
                const className = activeClass?.class?.name || 'Not Assigned';

                return (
                  <TableRow key={student.id}>
                    <TableCell className="text-center font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell>{removeAcademicYearFromClassName(className)}</TableCell>
                    <TableCell>
                      {paymentStatus.paid ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Paid
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unpaid</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {paymentStatus.paid && paymentStatus.payment?.receipt ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setReceiptDialog({ open: true, payment: paymentStatus.payment! })}
                            title="View Receipt"
                          >
                            <FileText className="h-4 w-4 text-green-600" />
                          </Button>
                        ) : (
                          monthFilter && (
                            <Button
                              size="sm"
                              onClick={() => setPaymentDialog({ open: true, student })}
                            >
                              <DollarSign className="mr-1 h-4 w-4" />
                              Pay
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <PaymentDialog
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog({ open, student: paymentDialog.student })}
        student={paymentDialog.student}
        academicYearStartDate={selectedAcademicYear?.startDate || null}
        academicYearEndDate={selectedAcademicYear?.endDate || null}
        defaultMonth={monthFilter}
        onSubmit={handleCreatePayment}
        isLoading={createPayment.isPending || confirmPayment.isPending}
      />

      <ReceiptDialog
        open={receiptDialog.open}
        onOpenChange={(open) => setReceiptDialog({ open, payment: receiptDialog.payment })}
        payment={receiptDialog.payment}
      />
    </div>
  );
}
