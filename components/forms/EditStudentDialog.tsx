'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateStudent } from '@/lib/hooks/use-students';
import { Student, UpdateStudentRequest } from '@/lib/types';
import { StudentForm } from './StudentForm';

interface EditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

export function EditStudentDialog({
  open,
  onOpenChange,
  student,
}: EditStudentDialogProps) {
  const updateStudent = useUpdateStudent();

  const handleUpdate = async (data: UpdateStudentRequest) => {
    if (student) {
      await updateStudent.mutateAsync({
        id: student.id,
        data,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update information for {student ? `${student.firstName} ${student.lastName}` : 'this student'}.
          </DialogDescription>
        </DialogHeader>
        {student && (
          <StudentForm
            student={student}
            onSubmit={handleUpdate}
            onCancel={() => onOpenChange(false)}
            isLoading={updateStudent.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
