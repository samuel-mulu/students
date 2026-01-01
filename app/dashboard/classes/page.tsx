'use client';

import { useClasses, useDeleteClass } from '@/lib/hooks/use-classes';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Class } from '@/lib/types';
import { Plus, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';

export default function ClassesPage() {
  const { hasRole } = useAuthStore();
  const { data, isLoading, error, refetch } = useClasses();
  const deleteClass = useDeleteClass();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; class: Class | null }>({
    open: false,
    class: null,
  });

  const handleDelete = async () => {
    if (deleteDialog.class) {
      await deleteClass.mutateAsync(deleteDialog.class.id);
      setDeleteDialog({ open: false, class: null });
    }
  };

  if (isLoading) {
    return <LoadingState rows={5} columns={3} />;
  }

  if (error) {
    return <ErrorState message="Failed to load classes" onRetry={() => refetch()} />;
  }

  const classes = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title">Classes</h1>
          <p className="text-body text-muted-foreground mt-1">
            Manage classes and their subjects
          </p>
        </div>
        {hasRole(['OWNER', 'REGISTRAR']) && (
          <Link href="/dashboard/classes/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Class
            </Button>
          </Link>
        )}
      </div>

      {classes.length === 0 ? (
        <EmptyState
          title="No classes found"
          description="Get started by creating a new class"
          action={
            hasRole(['OWNER', 'REGISTRAR'])
              ? {
                  label: 'Add Class',
                  onClick: () => (window.location.href = '/dashboard/classes/new'),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card key={cls.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                      <Link
                        href={`/dashboard/classes/${cls.id}`}
                        className="font-semibold hover:underline"
                      >
                        {cls.name}
                      </Link>
                      {cls.description && (
                        <p className="text-sm text-muted-foreground mt-1">{cls.description}</p>
                      )}
                      {cls.academicYear && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {cls.academicYear}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, class: deleteDialog.class })}
        title="Delete Class"
        description={`Are you sure you want to delete ${deleteDialog.class?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}

