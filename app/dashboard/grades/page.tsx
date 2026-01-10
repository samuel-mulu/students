"use client";

import { useState, useMemo } from "react";
import {
  useGrades,
  useDeleteGrade,
  useCreateGrade,
  useUpdateGrade,
} from "@/lib/hooks/use-grades";
import { useClasses } from "@/lib/hooks/use-classes";
import { useAcademicYears } from "@/lib/hooks/use-academicYears";
import { useDeleteClass } from "@/lib/hooks/use-classes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Grade, Class, AcademicYear } from "@/lib/types";
import { Plus, GraduationCap, Edit, Trash2, Settings, ChevronDown, ChevronUp, Users, Eye } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateClassDialog } from "@/components/forms/CreateClassDialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function GradesPage() {
  const { hasRole } = useAuthStore();
  const { data, isLoading, error, refetch } = useGrades();
  const { data: classesData } = useClasses();
  const { data: academicYearsData } = useAcademicYears();
  const createGrade = useCreateGrade();
  const updateGrade = useUpdateGrade();
  const deleteGrade = useDeleteGrade();
  const deleteClass = useDeleteClass();

  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [expandedAcademicYears, setExpandedAcademicYears] = useState<Set<string>>(new Set());
  const [createClassDialog, setCreateClassDialog] = useState<{
    open: boolean;
    gradeId?: string;
    academicYearId?: string;
  }>({
    open: false,
  });
  const [deleteClassDialog, setDeleteClassDialog] = useState<{
    open: boolean;
    class: Class | null;
  }>({
    open: false,
    class: null,
  });

  const [dialog, setDialog] = useState<{
    open: boolean;
    grade: Grade | null;
    mode: "create" | "edit";
  }>({
    open: false,
    grade: null,
    mode: "create",
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    grade: Grade | null;
  }>({
    open: false,
    grade: null,
  });

  const [formData, setFormData] = useState({
    name: "",
    order: 1,
    isHighest: false,
  });

  const classes = Array.isArray(classesData?.data) ? classesData.data : [];
  const academicYears = Array.isArray(academicYearsData?.data) ? academicYearsData.data : [];

  // Group classes by grade and academic year
  const classesByGrade = useMemo(() => {
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
      }
    });
    return grouped;
  }, [classes]);

  const toggleGradeExpansion = (gradeId: string) => {
    setExpandedGrades((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(gradeId)) {
        newSet.delete(gradeId);
      } else {
        newSet.add(gradeId);
      }
      return newSet;
    });
  };

  const toggleAcademicYearExpansion = (gradeId: string, academicYearId: string) => {
    const key = `${gradeId}-${academicYearId}`;
    setExpandedAcademicYears((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const isAcademicYearExpanded = (gradeId: string, academicYearId: string) => {
    const key = `${gradeId}-${academicYearId}`;
    return expandedAcademicYears.has(key);
  };

  const handleDeleteClass = async () => {
    if (deleteClassDialog.class) {
      await deleteClass.mutateAsync(deleteClassDialog.class.id);
      setDeleteClassDialog({ open: false, class: null });
    }
  };

  const getAcademicYearName = (academicYearId: string): string => {
    if (academicYearId === 'unknown') return 'Unknown';
    const year = academicYears.find((y) => y.id === academicYearId);
    return year?.name || academicYearId;
  };

  // Get sorted academic years by startDate (newest first)
  const getSortedAcademicYears = (gradeClasses: Record<string, Class[]>) => {
    return Object.entries(gradeClasses).sort(([yearId1], [yearId2]) => {
      if (yearId1 === 'unknown') return 1;
      if (yearId2 === 'unknown') return -1;
      
      const year1 = academicYears.find((y) => y.id === yearId1);
      const year2 = academicYears.find((y) => y.id === yearId2);
      
      if (!year1) return 1;
      if (!year2) return -1;
      
      // Sort by startDate descending (newest first)
      const date1 = new Date(year1.startDate).getTime();
      const date2 = new Date(year2.startDate).getTime();
      return date2 - date1;
    });
  };

  const handleOpenCreate = () => {
    setFormData({ name: "", order: 1, isHighest: false });
    setDialog({ open: true, grade: null, mode: "create" });
  };

  const handleOpenEdit = (grade: Grade) => {
    setFormData({
      name: grade.name,
      order: grade.order,
      isHighest: grade.isHighest,
    });
    setDialog({ open: true, grade, mode: "edit" });
  };

  const handleSubmit = async () => {
    if (dialog.mode === "create") {
      await createGrade.mutateAsync(formData);
    } else if (dialog.grade) {
      await updateGrade.mutateAsync({ id: dialog.grade.id, data: formData });
    }
    setDialog({ open: false, grade: null, mode: "create" });
  };

  const handleDelete = async () => {
    if (deleteDialog.grade) {
      await deleteGrade.mutateAsync(deleteDialog.grade.id);
      setDeleteDialog({ open: false, grade: null });
    }
  };

  if (isLoading) {
    return <LoadingState rows={5} columns={3} />;
  }

  if (error) {
    return (
      <ErrorState message="Failed to load grades" onRetry={() => refetch()} />
    );
  }

  const grades = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Grades</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage grade progression sequence
          </p>
        </div>
        <div className="flex gap-2">
          {hasRole(["OWNER", "REGISTRAR"]) && (
            <>
              <Button variant="outline" asChild>
                <Link href="/dashboard/settings?tab=grades">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage in Settings
                </Link>
              </Button>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Grade
              </Button>
            </>
          )}
        </div>
      </div>

      {grades.length === 0 ? (
        <EmptyState
          title="No grades found"
          description="Get started by creating a new grade"
          action={
            hasRole(["OWNER", "REGISTRAR"])
              ? {
                  label: "Add Grade",
                  onClick: handleOpenCreate,
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grades.map((grade) => {
            const gradeClasses = classesByGrade[grade.id] || {};
            const totalClasses = Object.values(gradeClasses).reduce((sum, arr) => sum + arr.length, 0);
            const isExpanded = expandedGrades.has(grade.id);

            return (
              <Card key={grade.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      {grade.name}
                    </div>
                    {totalClasses > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {totalClasses} {totalClasses === 1 ? 'class' : 'classes'}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Order: {grade.order}
                      </p>
                      {grade.isHighest && (
                        <p className="text-sm font-semibold text-primary">
                          Highest Grade
                        </p>
                      )}
                    </div>

                    {/* Classes Section */}
                    {totalClasses > 0 && (
                      <div className="border-t pt-3">
                        <button
                          onClick={() => toggleGradeExpansion(grade.id)}
                          className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span>Classes ({totalClasses})</span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-4">
                            {getSortedAcademicYears(gradeClasses).map(([academicYearId, yearClasses]) => {
                              const isYearExpanded = isAcademicYearExpanded(grade.id, academicYearId);
                              const totalClasses = yearClasses.length;
                              
                              return (
                                <div key={academicYearId} className="space-y-2">
                                  <button
                                    onClick={() => toggleAcademicYearExpansion(grade.id, academicYearId)}
                                    className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                                  >
                                    <span>{getAcademicYearName(academicYearId)}</span>
                                    <div className="flex items-center gap-2">
                                      {isYearExpanded && (
                                        <Badge variant="secondary" className="text-xs">
                                          {totalClasses} {totalClasses === 1 ? 'class' : 'classes'}
                                        </Badge>
                                      )}
                                      {isYearExpanded ? (
                                        <ChevronUp className="h-3 w-3" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3" />
                                      )}
                                    </div>
                                  </button>
                                  {isYearExpanded && (
                                    <div className="space-y-1 pl-2">
                                      {yearClasses.map((cls) => (
                                        <div
                                          key={cls.id}
                                          className="flex items-center justify-between p-2 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors"
                                        >
                                          <div className="flex items-center gap-2 flex-1">
                                            <Users className="h-3 w-3 text-muted-foreground" />
                                            <Link
                                              href={`/dashboard/classes/${cls.id}`}
                                              className="text-sm font-medium hover:underline"
                                            >
                                              {cls.name}
                                            </Link>
                                            {cls.description && (
                                              <span className="text-xs text-muted-foreground truncate">
                                                - {cls.description}
                                              </span>
                                            )}
                                          </div>
                                          {hasRole(["OWNER", "REGISTRAR"]) && (
                                            <div className="flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                asChild
                                              >
                                                <Link href={`/dashboard/classes/${cls.id}`}>
                                                  <Eye className="h-3 w-3" />
                                                </Link>
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                onClick={() => setDeleteClassDialog({ open: true, class: cls })}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {hasRole(["OWNER", "REGISTRAR"]) && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCreateClassDialog({ open: true, gradeId: grade.id });
                          }}
                          className="flex-1"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Class
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(grade)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, grade })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ ...dialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "create" ? "Create Grade" : "Edit Grade"}
            </DialogTitle>
            <DialogDescription>
              {dialog.mode === "create"
                ? "Add a new grade to the progression sequence"
                : "Update grade information"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Grade 1"
              />
            </div>
            <div>
              <Label htmlFor="order">Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    order: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isHighest"
                checked={formData.isHighest}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isHighest: checked as boolean })
                }
              />
              <Label htmlFor="isHighest">Mark as highest grade</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ ...dialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createGrade.isPending || updateGrade.isPending}
            >
              {dialog.mode === "create" ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        onConfirm={handleDelete}
        title="Delete Grade"
        description={`Are you sure you want to delete "${deleteDialog.grade?.name}"? This action cannot be undone.`}
      />

      <CreateClassDialog
        open={createClassDialog.open}
        onOpenChange={(open) => setCreateClassDialog({ ...createClassDialog, open })}
        gradeId={createClassDialog.gradeId}
        academicYearId={createClassDialog.academicYearId}
      />

      <ConfirmDialog
        open={deleteClassDialog.open}
        onOpenChange={(open) => setDeleteClassDialog({ ...deleteClassDialog, open })}
        onConfirm={handleDeleteClass}
        title="Delete Class"
        description={`Are you sure you want to delete "${deleteClassDialog.class?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
