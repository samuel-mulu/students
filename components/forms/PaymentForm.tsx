'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreatePaymentRequest } from '@/lib/types';
import { useStudents } from '@/lib/hooks/use-students';
import { usePaymentTypes } from '@/lib/hooks/use-payment-types';
import { formatCurrency } from '@/lib/utils/format';

const paymentSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  paymentTypeId: z.string().uuid('Payment type is required'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  year: z.number().min(2000).max(2100),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  onSubmit: (data: CreatePaymentRequest) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function PaymentForm({ onSubmit, onCancel, isLoading }: PaymentFormProps) {
  const { data: studentsData } = useStudents();
  const students = studentsData?.data || [];
  const { data: paymentTypesData, isLoading: paymentTypesLoading } = usePaymentTypes();
  const paymentTypes = Array.isArray(paymentTypesData?.data) 
    ? paymentTypesData.data.filter(pt => pt.isActive) 
    : [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      month: new Date().toISOString().slice(0, 7),
    },
  });

  const selectedPaymentTypeId = watch('paymentTypeId');
  const selectedPaymentType = paymentTypes.find(pt => pt.id === selectedPaymentTypeId);

  const handleFormSubmit = async (data: PaymentFormData) => {
    await onSubmit(data as CreatePaymentRequest);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="studentId">Student *</Label>
        <Select
          value={watch('studentId')}
          onValueChange={(value) => setValue('studentId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a student" />
          </SelectTrigger>
          <SelectContent>
            {students.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.firstName} {student.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.studentId && (
          <p className="text-sm text-destructive">{errors.studentId.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentType">Payment Type *</Label>
        <Select
          value={watch('paymentTypeId')}
          onValueChange={(value) => setValue('paymentTypeId', value)}
          disabled={paymentTypesLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={paymentTypesLoading ? "Loading..." : "Select payment type"} />
          </SelectTrigger>
          <SelectContent>
            {paymentTypes.length === 0 ? (
              <SelectItem value="" disabled>
                No payment types available
              </SelectItem>
            ) : (
              paymentTypes.map((paymentType) => (
                <SelectItem key={paymentType.id} value={paymentType.id}>
                  {paymentType.name} - {formatCurrency(paymentType.amount)}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.paymentTypeId && (
          <p className="text-sm text-destructive">{errors.paymentTypeId.message}</p>
        )}
        {selectedPaymentType && (
          <p className="text-sm text-muted-foreground">
            Amount: <span className="font-semibold">{formatCurrency(selectedPaymentType.amount)}</span>
            {selectedPaymentType.description && ` - ${selectedPaymentType.description}`}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="month">Month *</Label>
          <Input
            id="month"
            type="month"
            {...register('month', {
              onChange: (e) => {
                const [yearFromMonth] = e.target.value.split('-');
                if (yearFromMonth) {
                  setValue('year', parseInt(yearFromMonth));
                }
              },
            })}
          />
          {errors.month && (
            <p className="text-sm text-destructive">{errors.month.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="year">Year *</Label>
          <Input
            id="year"
            type="number"
            {...register('year', { valueAsNumber: true })}
            readOnly
          />
          {errors.year && (
            <p className="text-sm text-destructive">{errors.year.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Select
            value={watch('paymentMethod')}
            onValueChange={(value) => setValue('paymentMethod', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="card">Card</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" {...register('notes')} />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Payment'}
        </Button>
      </div>
    </form>
  );
}

