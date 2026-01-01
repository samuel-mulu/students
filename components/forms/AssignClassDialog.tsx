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

const assignClassSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  reason: z.string().min(1, 'Reason is required'),
});

type AssignClassFormData = z.infer<typeof assignClassSchema>;

interface AssignClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onConfirm: (classId: string, reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function AssignClassDialog({
  open,
  onOpenChange,
  student,
  onConfirm,
  isLoading,
}: AssignClassDialogProps) {
  const { data: classesData } = useClasses();
  const classes = classesData?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<AssignClassFormData>({
    resolver: zodResolver(assignClassSchema),
  });

  const onSubmit = async (data: AssignClassFormData) => {
    await onConfirm(data.classId, data.reason);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Class</DialogTitle>
          <DialogDescription>
            Assign {student ? `${student.firstName} ${student.lastName}` : 'this student'} to a class
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="classId">Class *</Label>
            <Select
              value={watch('classId')}
              onValueChange={(value) => setValue('classId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.classId && (
              <p className="text-sm text-destructive">{errors.classId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Input id="reason" {...register('reason')} placeholder="e.g., Initial assignment" />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

