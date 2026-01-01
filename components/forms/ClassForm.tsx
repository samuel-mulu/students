'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Class, CreateClassRequest, UpdateClassRequest } from '@/lib/types';

const classSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  description: z.string().optional(),
  academicYear: z.string().optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

interface ClassFormProps {
  classData?: Class;
  onSubmit: (data: CreateClassRequest | UpdateClassRequest) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ClassForm({ classData, onSubmit, onCancel, isLoading }: ClassFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: classData
      ? {
          name: classData.name,
          description: classData.description || '',
          academicYear: classData.academicYear || '',
        }
      : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Class Name *</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register('description')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="academicYear">Academic Year</Label>
        <Input id="academicYear" {...register('academicYear')} placeholder="e.g., 2024-2025" />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : classData ? 'Update Class' : 'Create Class'}
        </Button>
      </div>
    </form>
  );
}

