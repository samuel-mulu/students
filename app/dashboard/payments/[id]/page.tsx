'use client';

import { use } from 'react';
import { usePayment, useConfirmPayment, useGenerateReceipt } from '@/lib/hooks/use-payments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatCurrency, formatMonthYear, formatDate } from '@/lib/utils/format';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';

export default function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuthStore();
  const { data, isLoading, error } = usePayment(id);
  const confirmPayment = useConfirmPayment();
  const generateReceipt = useGenerateReceipt();
  const [confirmDialog, setConfirmDialog] = useState(false);

  const handleConfirm = async () => {
    await confirmPayment.mutateAsync({ id });
    setConfirmDialog(false);
  };

  const handleGenerateReceipt = async () => {
    await generateReceipt.mutateAsync(id);
  };

  if (isLoading) {
    return <LoadingState rows={5} columns={2} />;
  }

  if (error || !data?.data) {
    return <ErrorState message="Failed to load payment details" />;
  }

  const payment = data.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title">Payment Details</h1>
          <p className="text-body text-muted-foreground mt-1">
            {formatMonthYear(payment.month, payment.year)}
          </p>
        </div>
        <Badge variant={payment.status === 'confirmed' ? 'default' : 'secondary'}>
          {payment.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Student</p>
            <p className="text-sm">
              {payment.student
                ? `${payment.student.firstName} ${payment.student.lastName}`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Amount</p>
            <p className="text-sm font-semibold">{formatCurrency(payment.amount)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Month/Year</p>
            <p className="text-sm">{formatMonthYear(payment.month, payment.year)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <Badge variant={payment.status === 'confirmed' ? 'default' : 'secondary'}>
              {payment.status}
            </Badge>
          </div>
          {payment.paymentDate && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Payment Date</p>
              <p className="text-sm">{formatDate(payment.paymentDate)}</p>
            </div>
          )}
          {payment.paymentMethod && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
              <p className="text-sm capitalize">{payment.paymentMethod.replace('_', ' ')}</p>
            </div>
          )}
          {payment.notes && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p className="text-sm">{payment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {payment.receipt && (
        <Card>
          <CardHeader>
            <CardTitle>Receipt</CardTitle>
            <CardDescription>Receipt Number: {payment.receipt.receiptNumber}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Issued: {formatDate(payment.receipt.issuedDate)}
            </p>
          </CardContent>
        </Card>
      )}

      {hasRole(['OWNER', 'REGISTRAR']) && (
        <div className="flex gap-2">
          {payment.status === 'pending' && (
            <Button onClick={() => setConfirmDialog(true)} disabled={confirmPayment.isPending}>
              {confirmPayment.isPending ? 'Confirming...' : 'Confirm Payment'}
            </Button>
          )}
          {payment.status === 'confirmed' && !payment.receipt && (
            <Button onClick={handleGenerateReceipt} disabled={generateReceipt.isPending}>
              {generateReceipt.isPending ? 'Generating...' : 'Generate Receipt'}
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog}
        onOpenChange={setConfirmDialog}
        title="Confirm Payment"
        description="Are you sure you want to confirm this payment?"
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={handleConfirm}
      />
    </div>
  );
}

