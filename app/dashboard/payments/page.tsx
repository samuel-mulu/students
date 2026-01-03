'use client';

import { useState } from 'react';
import { usePayments, useDeletePayment } from '@/lib/hooks/use-payments';
import { useStudents } from '@/lib/hooks/use-students';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Payment } from '@/lib/types';
import { formatCurrency, formatMonthYear, formatDate } from '@/lib/utils/format';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth-store';

export default function PaymentsPage() {
  const { hasRole } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [studentFilter, setStudentFilter] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; payment: Payment | null }>({
    open: false,
    payment: null,
  });

  const { data, isLoading, error, refetch } = usePayments({
    status: statusFilter !== 'all' ? (statusFilter as 'pending' | 'confirmed') : undefined,
    studentId: studentFilter !== 'all' ? studentFilter : undefined,
  });

  const { data: studentsData } = useStudents();
  const students = Array.isArray(studentsData?.data) ? studentsData.data : [];
  const deletePayment = useDeletePayment();

  const handleDelete = async () => {
    if (deleteDialog.payment) {
      await deletePayment.mutateAsync(deleteDialog.payment.id);
      setDeleteDialog({ open: false, payment: null });
    }
  };

  if (isLoading) {
    return <LoadingState rows={5} columns={6} />;
  }

  if (error) {
    return <ErrorState message="Failed to load payments" onRetry={() => refetch()} />;
  }

  const payments = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student payments and receipts
          </p>
        </div>
        {hasRole(['OWNER', 'REGISTRAR']) && (
          <Link href="/dashboard/payments/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={studentFilter} onValueChange={setStudentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {payments.length === 0 ? (
        <EmptyState
          title="No payments found"
          description="Get started by adding a new payment"
          action={
            hasRole(['OWNER', 'REGISTRAR'])
              ? {
                  label: 'Add Payment',
                  onClick: () => (window.location.href = '/dashboard/payments/new'),
                }
              : undefined
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Month/Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Date</TableHead>
                {hasRole(['OWNER', 'REGISTRAR']) && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {payment.student
                      ? `${payment.student.firstName} ${payment.student.lastName}`
                      : '-'}
                  </TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>{formatMonthYear(payment.month, payment.year)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={payment.status === 'confirmed' ? 'default' : 'secondary'}
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payment.paymentDate ? formatDate(payment.paymentDate) : '-'}
                  </TableCell>
                  {hasRole(['OWNER', 'REGISTRAR']) && (
                    <TableCell>
                      <Link href={`/dashboard/payments/${payment.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, payment: deleteDialog.payment })}
        title="Delete Payment"
        description="Are you sure you want to delete this payment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}

