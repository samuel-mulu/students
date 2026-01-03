'use client';

import { useClasses, useDeleteClass } from '@/lib/hooks/use-classes';
import { useGrades } from '@/lib/hooks/use-grades';
import { useAcademicYears } from '@/lib/hooks/use-academicYears';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Class } from '@/lib/types';
import { Plus, GraduationCap, Users } from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { Badge } from '@/components/ui/badge';

export default function ClassesPage() {
  const { hasRole } = useAuthStore();
  const { data, isLoading, error, refetch } = useClasses();
  const { data: gradesData } = useGrades();
  const { data: academicYearsData } = useAcademicYears();
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
  const grades = Array.isArray(gradesData?.data) ? gradesData.data : [];
  const academicYears = Array.isArray(academicYearsData?.data) ? academicYearsData.data : [];

  // Group classes by grade and academic year
  const classesByGradeAndYear = useMemo(() => {
    const grouped: Record<string, Record<string, Class[]>> = {};
    classes.forEach((cls) => {
      if (cls.gradeId) {
        if (!grouped[cls.gradeId]) {
          grouped[cls.gradeId] = {};
        }
        const academicYearId = cls.academicYearId || 'unknown';
        if (!grouped[cls.gradeId][academicYearId]) {
          grouped[cls.gradeId][academicYearId] = [];
        }
        grouped[cls.gradeId][academicYearId].push(cls);
      } else {
        // Classes without grade go to a special group
        if (!grouped['no-grade']) {
          grouped['no-grade'] = {};
        }
        const academicYearId = cls.academicYearId || 'unknown';
        if (!grouped['no-grade'][academicYearId]) {
          grouped['no-grade'][academicYearId] = [];
        }
        grouped['no-grade'][academicYearId].push(cls);
      }
    });
    return grouped;
  }, [classes]);

  const getGradeName = (gradeId: string): string => {
    if (gradeId === 'no-grade') return 'Unassigned';
    const grade = grades.find((g) => g.id === gradeId);
    return grade?.name || gradeId;
  };

  const getAcademicYearName = (academicYearId: string): string => {
    if (academicYearId === 'unknown') return 'Unknown';
    const year = academicYears.find((y) => y.id === academicYearId);
    return year?.name || academicYearId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Classes</h1>
          <p className="text-sm text-muted-foreground mt-1">
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
          description="Get started by creating a new class. You can also manage classes from the Grades page."
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
        <div className="space-y-6">
          {Object.entries(classesByGradeAndYear).map(([gradeId, yearGroups]) => (
            <Card key={gradeId} className="border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  {getGradeName(gradeId)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(yearGroups).map(([academicYearId, yearClasses]) => (
                    <div key={academicYearId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          {getAcademicYearName(academicYearId)}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {yearClasses.length} {yearClasses.length === 1 ? 'class' : 'classes'}
                        </Badge>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pl-2">
                        {yearClasses.map((cls) => (
                          <Card key={cls.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2 flex-1">
                                  <Users className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <Link
                                      href={`/dashboard/classes/${cls.id}`}
                                      className="font-semibold hover:underline text-sm block truncate"
                                    >
                                      {cls.name}
                                    </Link>
                                    {cls.description && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {cls.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
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

