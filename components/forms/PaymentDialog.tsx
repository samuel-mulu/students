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
import { CreatePaymentRequest, CreateBulkPaymentRequest, Student } from '@/lib/types';
import { generateAllMonths, formatCurrency } from '@/lib/utils/format';
import { usePaymentTypes } from '@/lib/hooks/use-payment-types';
import { usePayments } from '@/lib/hooks/use-payments';
import { useEffect, useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Check, Loader2 } from 'lucide-react';

const paymentSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  paymentTypeId: z.string().uuid('Payment type is required'),
  months: z.array(z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')).min(1, 'At least one month must be selected'),
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
  onSubmit: (data: CreatePaymentRequest | CreateBulkPaymentRequest) => Promise<void>;
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

  // Fetch existing payments for the student
  const { data: paymentsData } = usePayments(
    student?.id ? { studentId: student.id } : undefined
  );
  const existingPayments = Array.isArray(paymentsData?.data) ? paymentsData.data : [];

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear();

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
      months: defaultMonth ? [defaultMonth] : [currentMonth],
      paymentMethod: '',
      notes: '',
    },
  });

  // Generate all 12 months for the current year
  const monthOptions = generateAllMonths(currentYear);

  // Create a map of paid months (month value -> payment status)
  const paidMonthsMap = useMemo(() => {
    const map = new Map<string, { status: string; confirmed: boolean }>();
    existingPayments.forEach((payment) => {
      map.set(payment.month, {
        status: payment.status,
        confirmed: payment.status === 'confirmed',
      });
    });
    return map;
  }, [existingPayments]);

  const selectedPaymentTypeId = watch('paymentTypeId');
  const selectedPaymentType = paymentTypes.find(pt => pt.id === selectedPaymentTypeId);
  const selectedMonths = watch('months') || [];

  // Reset form when student changes or dialog opens/closes
  useEffect(() => {
    if (open && student) {
      reset({
        studentId: student.id,
        paymentTypeId: '',
        months: defaultMonth ? [defaultMonth] : [currentMonth],
        paymentMethod: '',
        notes: '',
      });
    }
  }, [open, student, defaultMonth, reset, currentMonth]);

  const handleMonthToggle = (monthValue: string) => {
    // Don't allow toggling already paid (confirmed) months
    const isPaid = paidMonthsMap.has(monthValue) && paidMonthsMap.get(monthValue)?.confirmed;
    if (isPaid) {
      return; // Prevent selecting already paid months
    }

    // Allow selecting pending months (to confirm them) and unpaid months
    const currentMonths = watch('months') || [];
    if (currentMonths.includes(monthValue)) {
      setValue('months', currentMonths.filter(m => m !== monthValue), { shouldValidate: true });
    } else {
      setValue('months', [...currentMonths, monthValue], { shouldValidate: true });
    }
  };

  const handleFormSubmit = async (data: PaymentFormData) => {
    await onSubmit(data as CreateBulkPaymentRequest);
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const totalAmount = selectedPaymentType && selectedMonths.length > 0
    ? selectedPaymentType.amount * selectedMonths.length
    : 0;

  if (!student) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            Record payment for {student.firstName} {student.lastName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
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
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No payment types available
                  </div>
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
              <Label htmlFor="amount">Amount per Month</Label>
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
            <Label>Select Months *</Label>
            <div className="border-2 rounded-lg p-4 bg-slate-50 max-h-[240px] overflow-y-auto overscroll-contain">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {monthOptions.map((month) => {
                  const isSelected = selectedMonths.includes(month.value);
                  const isPaid = paidMonthsMap.has(month.value) && paidMonthsMap.get(month.value)?.confirmed;
                  const isPending = paidMonthsMap.has(month.value) && !paidMonthsMap.get(month.value)?.confirmed;
                  
                  return (
                    <div
                      key={month.value}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${
                        isPaid 
                          ? 'bg-green-50 border-green-200 cursor-not-allowed' 
                          : isPending && isSelected
                          ? 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200 cursor-pointer'
                          : isPending
                          ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300 cursor-pointer'
                          : isSelected
                          ? 'bg-blue-50 border-blue-300 hover:bg-blue-100 cursor-pointer'
                          : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                      }`}
                      onClick={() => !isPaid && handleMonthToggle(month.value)}
                    >
                      {isPaid ? (
                        <CheckCircle2 className="h-6 w-6 text-green-700 flex-shrink-0" fill="currentColor" />
                      ) : (
                        <div className="relative h-5 w-5 flex items-center justify-center">
                          {isSelected && isLoading ? (
                            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                          ) : (
                            <>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleMonthToggle(month.value)}
                                disabled={isPaid || isLoading}
                                className={`h-5 w-5 rounded-sm border-2 cursor-pointer appearance-none transition-all ${
                                  isSelected 
                                    ? 'bg-blue-600 border-blue-600' 
                                    : 'bg-white border-gray-300 hover:border-blue-500'
                                } ${isPaid || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                              />
                              {isSelected && (
                                <Check className="absolute h-4 w-4 text-white pointer-events-none left-0.5 top-0.5" strokeWidth={3} />
                              )}
                            </>
                          )}
                        </div>
                      )}
                      <div className="flex-1 flex flex-col">
                        <Label 
                          className={`text-sm font-medium ${
                            isPaid ? 'cursor-not-allowed text-gray-600' : 'cursor-pointer'
                          }`}
                        >
                          {month.label}
                        </Label>
                        {isPaid && (
                          <span className="text-xs text-green-600 font-semibold mt-0.5">✓ Paid</span>
                        )}
                        {isPending && (
                          <span className="text-xs text-yellow-600 font-semibold mt-0.5">
                            {isSelected ? '⏳ Will Confirm' : '⏳ Pending'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {errors.months && (
              <p className="text-sm text-destructive">{errors.months.message}</p>
            )}
            {selectedMonths.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">
                  {selectedMonths.length} month{selectedMonths.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>

          {selectedPaymentType && selectedMonths.length > 0 && (
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Amount:</span>
                <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedPaymentType.amount} × {selectedMonths.length} month{selectedMonths.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

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
          </div>

          <DialogFooter className="px-6 py-4 flex-shrink-0 border-t bg-muted/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || selectedMonths.length === 0}>
              {isLoading ? 'Creating...' : `Create Payment${selectedMonths.length > 1 ? `s (${selectedMonths.length})` : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
