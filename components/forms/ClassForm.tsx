"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Class, CreateClassRequest, UpdateClassRequest } from "@/lib/types";
import { useGrades } from "@/lib/hooks/use-grades";
import {
  useAcademicYears,
  useActiveAcademicYear,
} from "@/lib/hooks/use-academicYears";
import { useAuthStore } from "@/lib/store/auth-store";
import { useEffect, useMemo } from "react";

const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  description: z.string().optional(),
  gradeId: z.string().min(1, "Grade is required"),
  academicYearId: z.string().min(1, "Academic year is required"),
});

type ClassFormData = z.infer<typeof classSchema>;

interface ClassFormProps {
  classData?: Class;
  onSubmit: (data: CreateClassRequest | UpdateClassRequest) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  defaultGradeId?: string;
  defaultAcademicYearId?: string;
}

export function ClassForm({
  classData,
  onSubmit,
  onCancel,
  isLoading,
  defaultGradeId,
  defaultAcademicYearId,
}: ClassFormProps) {
  const { hasRole } = useAuthStore();
  const { data: gradesData } = useGrades();
  const { data: academicYearsData } = useAcademicYears();
  const { data: activeYearData } = useActiveAcademicYear();
  const grades = Array.isArray(gradesData?.data) ? gradesData.data : [];
  const allAcademicYears = Array.isArray(academicYearsData?.data)
    ? academicYearsData.data
    : [];
  const activeYear = activeYearData?.data;
  const isTeacher = hasRole(["TEACHER"]);
  const isCreating = !classData;

  // Filter academic years: teachers see only active, owners creating see only active
  const academicYears = useMemo(() => {
    if (isTeacher || (isCreating && !defaultAcademicYearId)) {
      // For teachers or owners creating classes, show only active academic year
      if (activeYear) {
        return [activeYear];
      }
      return [];
    }
    // For editing existing classes or when defaultAcademicYearId is provided, show all
    return allAcademicYears;
  }, [
    isTeacher,
    isCreating,
    defaultAcademicYearId,
    activeYear,
    allAcademicYears,
  ]);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: classData
      ? {
          name: classData.name,
          description: classData.description || "",
          gradeId: classData.gradeId || "",
          academicYearId: classData.academicYearId || "",
        }
      : {
          gradeId: defaultGradeId || "",
          academicYearId: defaultAcademicYearId || "",
        },
  });

  useEffect(() => {
    if (defaultGradeId) {
      setValue("gradeId", defaultGradeId);
    }
    if (defaultAcademicYearId) {
      setValue("academicYearId", defaultAcademicYearId);
    } else if (isCreating && activeYear && !classData) {
      // Auto-select active academic year when creating a new class
      setValue("academicYearId", activeYear.id);
    }
  }, [
    defaultGradeId,
    defaultAcademicYearId,
    setValue,
    isCreating,
    activeYear,
    classData,
  ]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gradeId">Grade *</Label>
        <Controller
          name="gradeId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={!!classData || !!defaultGradeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.gradeId && (
          <p className="text-sm text-destructive">{errors.gradeId.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="academicYearId">Academic Year *</Label>
        <Controller
          name="academicYearId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={!!classData || !!defaultAcademicYearId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an academic year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {isTeacher || isCreating
                      ? "No active academic year found. Please set an active academic year first."
                      : "No academic years available"}
                  </div>
                ) : (
                  academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        />
        {errors.academicYearId && (
          <p className="text-sm text-destructive">
            {errors.academicYearId.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Class Name *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="e.g., Grade 1A, Grade 1B"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register("description")} />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Saving..."
            : classData
            ? "Update Class"
            : "Create Class"}
        </Button>
      </div>
    </form>
  );
}
