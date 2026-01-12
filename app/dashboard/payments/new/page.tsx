'use client';

import { useRouter } from 'next/navigation';
import { useCreateBulkPayment, useConfirmBulkPayments } from '@/lib/hooks/use-payments';
import { PaymentForm } from '@/components/forms/PaymentForm';
import { CreatePaymentRequest, CreateBulkPaymentRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewPaymentPage() {
  const router = useRouter();
  const createBulkPayment = useCreateBulkPayment();
  const confirmBulkPayments = useConfirmBulkPayments();

  const handleSubmit = async (data: CreatePaymentRequest | CreateBulkPaymentRequest) => {
    // Check if it's a bulk payment request (has months array)
    if ('months' in data && Array.isArray(data.months)) {
      // Handle bulk payment
      const bulkData = data as CreateBulkPaymentRequest;
      const payments = await createBulkPayment.mutateAsync(bulkData);
      
      // Auto-confirm all payments with one shared receipt
      const paymentIds = payments.map(p => p.id);
      await confirmBulkPayments.mutateAsync({
        paymentIds,
        paymentDate: new Date().toISOString(),
        paymentMethod: bulkData.paymentMethod || 'cash',
      });
    } else {
      // Handle single payment (backward compatibility)
      // Convert to bulk format for consistency
      const singleData = data as CreatePaymentRequest;
      const month = `${singleData.year}-${String(singleData.month).padStart(2, '0')}`;
      const bulkData: CreateBulkPaymentRequest = {
        studentId: singleData.studentId,
        paymentTypeId: singleData.paymentTypeId,
        months: [month],
        paymentMethod: singleData.paymentMethod,
        notes: singleData.notes,
      };
      const payments = await createBulkPayment.mutateAsync(bulkData);
      
      // Auto-confirm
      const paymentIds = payments.map(p => p.id);
      await confirmBulkPayments.mutateAsync({
        paymentIds,
        paymentDate: new Date().toISOString(),
        paymentMethod: singleData.paymentMethod || 'cash',
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

