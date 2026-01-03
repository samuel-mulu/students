'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Student, Class } from '@/lib/types';
import { useClasses } from '@/lib/hooks/use-classes';

const transferClassSchema = z.object({
  newClassId: z.string().min(1, 'Class is required'),
  reason: z.string().min(1, 'Reason is required'),
});

type TransferClassFormData = z.infer<typeof transferClassSchema>;

interface TransferClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onConfirm: (newClassId: string, reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function TransferClassDialog({
  open,
  onOpenChange,
  student,
  onConfirm,
  isLoading,
}: TransferClassDialogProps) {
  const { data: classesData } = useClasses();
  const classes = classesData?.data || [];
  
  // Get current class from student's classHistory
  const currentClass = student?.classHistory?.find((ch) => !ch.endDate)?.class;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TransferClassFormData>({
    resolver: zodResolver(transferClassSchema),
  });

  const onSubmit = async (data: TransferClassFormData) => {
    await onConfirm(data.newClassId, data.reason);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Class</DialogTitle>
          <DialogDescription>
            Transfer {student ? `${student.firstName} ${student.lastName}` : 'this student'} to a different class
            {currentClass && ` (currently in ${currentClass.name})`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newClassId">New Class *</Label>
            <Select
              value={watch('newClassId')}
              onValueChange={(value) => setValue('newClassId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes
                  .filter((cls) => cls.id !== currentClass?.id)
                  .map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.newClassId && (
              <p className="text-sm text-destructive">{errors.newClassId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Input id="reason" {...register('reason')} placeholder="e.g., Academic performance, parent request" />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Transferring...' : 'Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

