'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClassForm } from './ClassForm';
import { CreateClassRequest, UpdateClassRequest } from '@/lib/types';
import { useCreateClass } from '@/lib/hooks/use-classes';

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gradeId?: string;
  academicYearId?: string;
}

export function CreateClassDialog({ open, onOpenChange, gradeId, academicYearId }: CreateClassDialogProps) {
  const createClass = useCreateClass();

  const handleSubmit = async (data: CreateClassRequest | UpdateClassRequest) => {
    await createClass.mutateAsync(data as CreateClassRequest);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
          <DialogDescription>
            Add a new class section for the selected grade and academic year.
          </DialogDescription>
        </DialogHeader>
        <ClassForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={createClass.isPending}
          defaultGradeId={gradeId}
          defaultAcademicYearId={academicYearId}
        />
      </DialogContent>
    </Dialog>
  );
}
