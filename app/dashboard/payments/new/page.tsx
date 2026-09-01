'use client';

import { useRouter } from 'next/navigation';
import { useCreateBulkPayment, useConfirmBulkPayments } from '@/lib/hooks/use-payments';
import { useActiveAcademicYear } from '@/lib/hooks/use-academicYears';
import { PaymentForm } from '@/components/forms/PaymentForm';
import { CreatePaymentRequest, CreateBulkPaymentRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewPaymentPage() {
  const router = useRouter();
  const createBulkPayment = useCreateBulkPayment();
  const confirmBulkPayments = useConfirmBulkPayments();
  const { data: activeYearData } = useActiveAcademicYear();
  const activeAcademicYearId = activeYearData?.data?.id;

  const handleSubmit = async (data: CreatePaymentRequest | CreateBulkPaymentRequest) => {
    if (!activeAcademicYearId) {
      return;
    }

    const withYear = { ...data, academicYearId: activeAcademicYearId };

    // Check if it's a bulk payment request (has months array)
    if ('months' in withYear && Array.isArray(withYear.months)) {
      // Handle bulk payment
      const bulkData = withYear as CreateBulkPaymentRequest;
      const payments = await createBulkPayment.mutateAsync(bulkData);
      
      // Auto-confirm all payments with one shared receipt
      const paymentIds = payments.map(p => p.id);
      await confirmBulkPayments.mutateAsync({
        paymentIds,
        paymentDate: new Date().toISOString(),
        paymentMethod: bulkData.paymentMethod || 'cash',
        payerName: bulkData.payerName,
        proofImageUrl: bulkData.proofImageUrl,
        transactionNumber: bulkData.transactionNumber,
      });
    } else {
      // Handle single payment (backward compatibility)
      // Convert to bulk format for consistency
      const singleData = withYear as CreatePaymentRequest;
      const month = `${singleData.year}-${String(singleData.month).padStart(2, '0')}`;
      const bulkData: CreateBulkPaymentRequest = {
        studentId: singleData.studentId,
        academicYearId: activeAcademicYearId,
        paymentTypeId: singleData.paymentTypeId,
        months: [month],
        paymentMethod: singleData.paymentMethod,
        notes: singleData.notes,
        payerName: singleData.payerName,
        proofImageUrl: singleData.proofImageUrl,
        transactionNumber: singleData.transactionNumber,
      };
      const payments = await createBulkPayment.mutateAsync(bulkData);
      
      // Auto-confirm
      const paymentIds = payments.map(p => p.id);
      await confirmBulkPayments.mutateAsync({
        paymentIds,
        paymentDate: new Date().toISOString(),
        paymentMethod: singleData.paymentMethod || 'cash',
        payerName: singleData.payerName,
        proofImageUrl: singleData.proofImageUrl,
        transactionNumber: singleData.transactionNumber,
      });
    }
    
    router.push('/dashboard/payments');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Add New Payment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record a new payment
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentForm
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={createBulkPayment.isPending || confirmBulkPayments.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}

