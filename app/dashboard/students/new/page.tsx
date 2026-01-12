'use client';

import { useRouter } from 'next/navigation';
import { useCreateStudent } from '@/lib/hooks/use-students';
import { useCreateBulkPayment, useConfirmBulkPayments } from '@/lib/hooks/use-payments';
import { StudentForm } from '@/components/forms/StudentForm';
import { CreateStudentRequest, UpdateStudentRequest, CreateBulkPaymentRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/shared/BackButton';
import { ReceiptDialog } from '@/components/shared/ReceiptDialog';
import { useState } from 'react';
import { Payment } from '@/lib/types';

export default function NewStudentPage() {
  const router = useRouter();
  const createStudent = useCreateStudent();
  const createBulkPayment = useCreateBulkPayment();
  const confirmBulkPayments = useConfirmBulkPayments();
  const [receiptDialog, setReceiptDialog] = useState<{
    open: boolean;
    payment: Payment | null;
    payments?: Payment[];
    isLoading?: boolean;
  }>({
    open: false,
    payment: null,
    payments: undefined,
    isLoading: false,
  });

  const handleSubmit = async (data: CreateStudentRequest | UpdateStudentRequest) => {
    // Extract payment fields
    const { paymentTypeId, months, paymentMethod, paymentNotes, ...studentData } = data as any;

    // Create student first
    const result = await createStudent.mutateAsync(studentData as CreateStudentRequest);

    // If payment fields are provided, process payment
    if (paymentTypeId && months && Array.isArray(months) && months.length > 0) {
      try {
        // Show loading state for receipt
        setReceiptDialog({ 
          open: true, 
          payment: null, 
          payments: undefined, 
          isLoading: true 
        });

        // Create bulk payment
        const payments = await createBulkPayment.mutateAsync({
          studentId: result.id,
          paymentTypeId,
          months,
          paymentMethod: paymentMethod || 'cash',
          notes: paymentNotes,
        });

        // Auto-confirm all payments with one shared receipt
        const paymentIds = payments.map(p => p.id);
        const confirmResult = await confirmBulkPayments.mutateAsync({
          paymentIds,
          paymentDate: new Date().toISOString(),
          paymentMethod: paymentMethod || 'cash',
        });

        // Show receipt dialog with all payments and shared receipt
        if (confirmResult.receipt && confirmResult.payments.length > 0) {
          setReceiptDialog({ 
            open: true, 
            payment: confirmResult.payments[0],
            payments: confirmResult.payments.length > 1 ? confirmResult.payments : undefined,
            isLoading: false
          });
        } else {
          setReceiptDialog({ open: false, payment: null, isLoading: false });
          router.push(`/dashboard/students/${result.id}`);
        }
      } catch (error) {
        console.error('Error processing payment:', error);
        setReceiptDialog({ open: false, payment: null, isLoading: false });
        // Student is already created, redirect anyway
        router.push(`/dashboard/students/${result.id}`);
      }
    } else {
      // No payment, just redirect
      router.push(`/dashboard/students/${result.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/dashboard/students" />
      <div>
          <h1 className="text-xl font-semibold">Add New Student</h1>
          <p className="text-sm text-muted-foreground mt-1">
          Enter student information to create a new record
        </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentForm
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={createStudent.isPending || createBulkPayment.isPending || confirmBulkPayments.isPending}
          />
        </CardContent>
      </Card>

      <ReceiptDialog
        open={receiptDialog.open}
        onOpenChange={(open) => {
          setReceiptDialog({ 
            open, 
            payment: receiptDialog.payment,
            payments: receiptDialog.payments,
            isLoading: false
          });
          // Redirect after closing receipt dialog
          if (!open && receiptDialog.payment) {
            router.push(`/dashboard/students/${receiptDialog.payment.studentId}`);
          }
        }}
        payment={receiptDialog.payment}
        payments={receiptDialog.payments}
        isLoading={receiptDialog.isLoading}
      />
    </div>
  );
}

