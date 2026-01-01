'use client';

import { use } from 'react';
import { useClass, useClassSubjects, useCreateSubject, useDeleteSubject } from '@/lib/hooks/use-classes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateSubjectRequest } from '@/lib/types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: classData, isLoading: classLoading, error: classError } = useClass(id);
  const { data: subjectsData, isLoading: subjectsLoading } = useClassSubjects(id);
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; subjectId: string | null }>({
    open: false,
    subjectId: null,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  });

  const handleCreateSubject = async (data: SubjectFormData) => {
    await createSubject.mutateAsync({ classId: id, data: data as CreateSubjectRequest });
    reset();
    setSubjectDialog(false);
  };

  const handleDeleteSubject = async () => {
    if (deleteDialog.subjectId) {
      await deleteSubject.mutateAsync(deleteDialog.subjectId);
      setDeleteDialog({ open: false, subjectId: null });
    }
  };

  if (classLoading) {
    return <LoadingState rows={5} columns={2} />;
  }

  if (classError || !classData?.data) {
    return <ErrorState message="Failed to load class details" />;
  }

  const cls = classData.data;
  const subjects = Array.isArray(subjectsData?.data) ? subjectsData.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">{cls.name}</h1>
        <p className="text-body text-muted-foreground mt-1">
          {cls.description || 'Class Details'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Name</p>
            <p className="text-sm">{cls.name}</p>
          </div>
          {cls.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm">{cls.description}</p>
            </div>
          )}
          {cls.academicYear && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Academic Year</p>
              <p className="text-sm">{cls.academicYear}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Subjects</CardTitle>
            <CardDescription>Manage subjects for this class</CardDescription>
          </div>
          <Button onClick={() => setSubjectDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Subject
          </Button>
        </CardHeader>
        <CardContent>
          {subjectsLoading ? (
            <LoadingState rows={3} columns={3} />
          ) : subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No subjects added yet</p>
          ) : (
            <div className="space-y-2">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <p className="font-medium">{subject.name}</p>
                    {subject.code && (
                      <p className="text-sm text-muted-foreground">{subject.code}</p>
                    )}
                    {subject.description && (
                      <p className="text-sm text-muted-foreground">{subject.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteDialog({ open: true, subjectId: subject.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={subjectDialog} onOpenChange={setSubjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>Add a new subject to this class</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreateSubject)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Subject Code</Label>
              <Input id="code" {...register('code')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register('description')} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubjectDialog(false)}
                disabled={createSubject.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createSubject.isPending}>
                {createSubject.isPending ? 'Adding...' : 'Add Subject'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, subjectId: deleteDialog.subjectId })}
        title="Delete Subject"
        description="Are you sure you want to delete this subject? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteSubject}
        variant="destructive"
      />
    </div>
  );
}

