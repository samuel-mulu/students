'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreatePaymentRequest, Student } from '@/lib/types';
import { generateMonthsFromAcademicYear, formatCurrency } from '@/lib/utils/format';
import { usePaymentTypes } from '@/lib/hooks/use-payment-types';
import { useEffect } from 'react';

const paymentSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  paymentTypeId: z.string().uuid('Payment type is required'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  year: z.number().min(2000).max(2100),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  academicYearStartDate: string | Date | null;
  academicYearEndDate: string | Date | null;
  defaultMonth?: string;
  onSubmit: (data: CreatePaymentRequest) => Promise<void>;
  isLoading?: boolean;
}

export function PaymentDialog({
  open,
  onOpenChange,
  student,
  academicYearStartDate,
  academicYearEndDate,
  defaultMonth,
  onSubmit,
  isLoading,
}: PaymentDialogProps) {
  // Fetch payment types
  const { data: paymentTypesData, isLoading: paymentTypesLoading } = usePaymentTypes();
  const paymentTypes = Array.isArray(paymentTypesData?.data) ? paymentTypesData.data.filter(pt => pt.isActive) : [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      studentId: student?.id || '',
      paymentTypeId: '',
      month: defaultMonth || new Date().toISOString().slice(0, 7),
      year: defaultMonth ? parseInt(defaultMonth.split('-')[0]) : new Date().getFullYear(),
      paymentMethod: '',
      notes: '',
    },
  });

  // Generate months from academic year
  const monthOptions = academicYearStartDate && academicYearEndDate
    ? generateMonthsFromAcademicYear(academicYearStartDate, academicYearEndDate)
    : [];

  const selectedPaymentTypeId = watch('paymentTypeId');
  const selectedPaymentType = paymentTypes.find(pt => pt.id === selectedPaymentTypeId);

  // Reset form when student changes or dialog opens/closes
  useEffect(() => {
    if (open && student) {
      reset({
        studentId: student.id,
        paymentTypeId: '',
        month: defaultMonth || new Date().toISOString().slice(0, 7),
        year: defaultMonth ? parseInt(defaultMonth.split('-')[0]) : new Date().getFullYear(),
        paymentMethod: '',
        notes: '',
      });
    }
  }, [open, student, defaultMonth, reset]);

  const selectedMonth = watch('month');
  useEffect(() => {
    if (selectedMonth) {
      const [yearPart] = selectedMonth.split('-');
      if (yearPart) {
        setValue('year', parseInt(yearPart));
      }
    }
  }, [selectedMonth, setValue]);

  const handleFormSubmit = async (data: PaymentFormData) => {
    await onSubmit(data);
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  if (!student) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            Record payment for {student.firstName} {student.lastName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">Student *</Label>
            <Input
              id="student"
              value={`${student.firstName} ${student.lastName}`}
              readOnly
              disabled
              className="bg-muted"
            />
            <input type="hidden" {...register('studentId')} />
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
          </div>

          {selectedPaymentType && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                value={formatCurrency(selectedPaymentType.amount)}
                readOnly
                disabled
                className="bg-muted font-semibold"
              />
              {selectedPaymentType.description && (
                <p className="text-xs text-muted-foreground">{selectedPaymentType.description}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="month">Month *</Label>
            {monthOptions.length > 0 ? (
              <Select
                value={watch('month')}
                onValueChange={(value) => {
                  setValue('month', value);
                  const [yearPart] = value.split('-');
                  if (yearPart) {
                    setValue('year', parseInt(yearPart));
                  }
                }}
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
            ) : (
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
            )}
            {errors.month && (
              <p className="text-sm text-destructive">{errors.month.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              value={watch('paymentMethod') || ''}
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" {...register('notes')} placeholder="Optional notes" />
          </div>

          <input type="hidden" {...register('year')} />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
