'use client';

import { useRouter } from 'next/navigation';
import { useCreatePayment } from '@/lib/hooks/use-payments';
import { PaymentForm } from '@/components/forms/PaymentForm';
import { CreatePaymentRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewPaymentPage() {
  const router = useRouter();
  const createPayment = useCreatePayment();

  const handleSubmit = async (data: CreatePaymentRequest) => {
    await createPayment.mutateAsync(data);
    router.push('/dashboard/payments');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Add New Payment</h1>
        <p className="text-body text-muted-foreground mt-1">
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
            isLoading={createPayment.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}

