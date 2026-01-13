"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useStudents,
  useDeleteStudent,
  useAssignClass,
  useTransferClass,
} from "@/lib/hooks/use-students";
import { useClasses } from "@/lib/hooks/use-classes";
import {
  useAcademicYears,
  useActiveAcademicYear,
} from "@/lib/hooks/use-academicYears";
import { useGrades } from "@/lib/hooks/use-grades";
import { StudentsTable } from "@/components/tables/StudentsTable";
import { AssignClassDialog } from "@/components/forms/AssignClassDialog";
import { TransferClassDialog } from "@/components/forms/TransferClassDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Student } from "@/lib/types";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth-store";

export default function StudentsPage() {
  const { hasRole } = useAuthStore();

  // Helper function to remove academic year from class name (e.g., "Grade 1A (2024-2025)" -> "Grade 1A")
  const removeAcademicYearFromClassName = (className: string): string => {
    // Remove anything in parentheses at the end of the string
    return className.replace(/\s*\([^)]*\)\s*$/, "").trim();
  };
  const [page, setPage] = useState(1);
  const [limit] = useState(40);
  const [search, setSearch] = useState("");
  const [classStatusFilter, setClassStatusFilter] = useState<string>("all");
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [showGradeClasses, setShowGradeClasses] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    student: Student | null;
  }>({
    open: false,
    student: null,
  });
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    student: Student | null;
  }>({
    open: false,
    student: null,
  });
  const [transferDialog, setTransferDialog] = useState<{
    open: boolean;
    student: Student | null;
  }>({
    open: false,
    student: null,
  });

  const { data: classesData } = useClasses();
  const { data: academicYearsData } = useAcademicYears();
  const { data: activeYearData } = useActiveAcademicYear();
  const { data: gradesData } = useGrades();

  const academicYears = Array.isArray(academicYearsData?.data)
    ? academicYearsData.data
    : [];
  const grades = Array.isArray(gradesData?.data) ? gradesData.data : [];
  const allClasses = Array.isArray(classesData?.data) ? classesData.data : [];

  // Set default academic year to active or latest (only if not filtering by "new" status)
  useEffect(() => {
    if (classStatusFilter === "new") {
      // Reset academic year filter when showing "new" students
      setAcademicYearFilter("");
      setGradeFilter("all");
      setClassFilter("all");
      setShowGradeClasses(false);
    } else if (!academicYearFilter && academicYears.length > 0) {
      if (activeYearData?.data?.id) {
        setAcademicYearFilter(activeYearData.data.id);
      } else {
        // If no active year, use the latest (most recent startDate)
        const latest = academicYears.sort(
          (a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )[0];
        if (latest) {
          setAcademicYearFilter(latest.id);
        }
      }
    }
  }, [academicYears, activeYearData, academicYearFilter, classStatusFilter]);

  // Filter classes by academic year only (for general filtering)
  const classesByAcademicYear = useMemo(() => {
    if (!academicYearFilter) return allClasses;
    return allClasses.filter(
      (cls) =>
        cls.academicYearId === academicYearFilter ||
        (typeof cls.academicYear === "object" &&
          cls.academicYear?.id === academicYearFilter) ||
        cls.academicYear === academicYearFilter
    );
  }, [allClasses, academicYearFilter]);

  // Get classes for selected grade (when grade is selected, show only classes for that grade and academic year)
  const gradeClasses = useMemo(() => {
    if (gradeFilter === "all" || !academicYearFilter) return [];
    return classesByAcademicYear.filter((cls) => cls.gradeId === gradeFilter);
  }, [classesByAcademicYear, gradeFilter, academicYearFilter]);

  // When academic year changes, reset grade and class filters
  useEffect(() => {
    if (academicYearFilter) {
      setGradeFilter("all");
      setClassFilter("all");
      setShowGradeClasses(false);
    }
  }, [academicYearFilter]);

  // Determine if we need to fetch all students (for grade filtering) or filter by classId
  const shouldFetchAllStudents = gradeFilter !== "all" && classFilter === "all";

  const { data, isLoading, error, refetch } = useStudents({
    page,
    limit,
    classStatus:
      classStatusFilter !== "all"
        ? (classStatusFilter as "new" | "assigned")
        : undefined,
    // Only filter by classId if a specific class is selected
    // If "All Classes in Grade" is selected, fetch all students and filter client-side
    classId: classFilter !== "all" ? classFilter : undefined,
  });

  const deleteStudent = useDeleteStudent();
  const assignClass = useAssignClass();
  const transferClass = useTransferClass();

  const handleDelete = async () => {
    if (deleteDialog.student) {
      await deleteStudent.mutateAsync(deleteDialog.student.id);
      setDeleteDialog({ open: false, student: null });
    }
  };

  const handleAssignClass = async (classId: string, reason: string) => {
    if (assignDialog.student) {
      await assignClass.mutateAsync({
        id: assignDialog.student.id,
        data: { classId, reason },
      });
      setAssignDialog({ open: false, student: null });
    }
  };

  const handleTransferClass = async (newClassId: string, reason: string) => {
    if (transferDialog.student) {
      await transferClass.mutateAsync({
        id: transferDialog.student.id,
        data: { newClassId, reason },
      });
      setTransferDialog({ open: false, student: null });
    }
  };

  // Filter students by search term, academic year, grade, and class
  const students = Array.isArray(data?.data) ? data.data : [];
  const filteredStudents = useMemo(() => {
    // Determine what filtering is needed
    // If a specific class is selected, the API already filtered by classId (which includes academic year)
    const needsGradeFiltering =
      gradeFilter !== "all" && classFilter === "all" && gradeClasses.length > 0;
    const needsAcademicYearFiltering =
      academicYearFilter &&
      classFilter === "all" &&
      classesByAcademicYear.length > 0;
    const needsAnyFiltering = needsGradeFiltering || needsAcademicYearFiltering;

    if (!needsAnyFiltering) {
      // No client-side filtering needed
      return students;
    }

    // Create sets of class IDs for filtering
    const gradeClassIds = needsGradeFiltering
      ? new Set(gradeClasses.map((cls) => cls.id))
      : null;
    const academicYearClassIds = needsAcademicYearFiltering
      ? new Set(classesByAcademicYear.map((cls) => cls.id))
      : null;

    return students.filter((student: Student) => {
      // Get student's current class from classHistory
      let studentClassId: string | null = null;
      if ("classHistory" in student && Array.isArray(student.classHistory)) {
        const activeClass = student.classHistory.find((ch: any) => !ch.endDate);
        if (activeClass) {
          // Check different possible structures
          studentClassId =
            activeClass.class?.id ||
            activeClass.classId ||
            (typeof activeClass.class === "string" ? activeClass.class : null);
        }
      }

      // If we can't find class info, exclude the student when filtering is needed
      if (
        !studentClassId &&
        (needsGradeFiltering || needsAcademicYearFiltering)
      ) {
        return false;
      }

      // Filter by academic year (if no specific class is selected)
      // This ensures students are only from classes in the selected academic year
      if (
        needsAcademicYearFiltering &&
        academicYearClassIds &&
        studentClassId
      ) {
        if (!academicYearClassIds.has(studentClassId)) {
          return false;
        }
      }

      // Filter by grade (if grade is selected and "all classes" is selected)
      // Note: gradeClasses are already filtered by academic year, so this also respects academic year
      if (needsGradeFiltering && gradeClassIds && studentClassId) {
        if (!gradeClassIds.has(studentClassId)) {
          return false;
        }
      }

      return true;
    });
  }, [
    students,
    academicYearFilter,
    gradeFilter,
    classFilter,
    gradeClasses,
    classesByAcademicYear,
  ]);

  // Sort filtered students alphabetically by first name (A, B, C...)
  const sortedFilteredStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      return (a.firstName || "").localeCompare(b.firstName || "");
    });
  }, [filteredStudents]);

  // Check if filters are fully applied (class is selected, meaning we have a specific filtered list)
  const isFullyFiltered =
    classFilter !== "all" || (academicYearFilter && gradeFilter !== "all");

  // Handle number search: when filters are fully applied and search is a number, find student by row number
  const finalStudents = useMemo(() => {
    // Check if search is a number and filters are fully applied
    const searchAsNumber = parseInt(search.trim());
    const isNumberSearch =
      !isNaN(searchAsNumber) && search.trim() !== "" && isFullyFiltered;

    if (isNumberSearch && searchAsNumber > 0) {
      // Find student at that position (1-indexed)
      const studentIndex = searchAsNumber - 1;
      if (studentIndex >= 0 && studentIndex < sortedFilteredStudents.length) {
        return [sortedFilteredStudents[studentIndex]];
      }
      // If number is out of range, return empty array
      return [];
    }

    // If search is not a number or filters not fully applied, use text search on sorted list
    if (search.trim() === "") {
      return sortedFilteredStudents;
    }

    // Apply text search on already sorted and filtered students
    const searchLower = search.toLowerCase();
    return sortedFilteredStudents.filter((student) => {
      return (
        student.firstName.toLowerCase().includes(searchLower) ||
        student.lastName.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower) ||
        student.phone?.toLowerCase().includes(searchLower)
      );
    });
  }, [sortedFilteredStudents, search, isFullyFiltered]);

  if (isLoading) {
    return <LoadingState rows={5} columns={6} />;
  }

  if (error) {
    return (
      <ErrorState message="Failed to load students" onRetry={() => refetch()} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student records and information
          </p>
        </div>
        {hasRole(["OWNER", "REGISTRAR"]) && (
          <Link href="/dashboard/students/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-4 ${classStatusFilter === "new" ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4"}`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Academic Year Filter - Hidden when filtering by "new" students */}
            {classStatusFilter !== "new" && (
              <Select
                value={academicYearFilter}
                onValueChange={(value) => {
                  setAcademicYearFilter(value);
                  setGradeFilter("all");
                  setClassFilter("all");
                  setShowGradeClasses(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                      {activeYearData?.data?.id === year.id && " (Active)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Grade Filter - Hidden when filtering by "new" students */}
            {classStatusFilter !== "new" && (
              <Select
                value={gradeFilter}
                onValueChange={(value) => {
                  setGradeFilter(value);
                  setClassFilter("all");
                  setShowGradeClasses(value !== "all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {grades.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Class Status Filter */}
            <Select
              value={classStatusFilter}
              onValueChange={setClassStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Class Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show classes dropdown when grade is selected (hidden for "new" students) */}
          {classStatusFilter !== "new" && showGradeClasses && gradeFilter !== "all" && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-xs text-gray-400 font-medium mb-2 block">
                Sections/Classes for Selected Grade
              </Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full md:w-auto">
                  <SelectValue placeholder="Select Section/Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes in Grade</SelectItem>
                  {gradeClasses.length > 0 ? (
                    gradeClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {removeAcademicYearFromClassName(cls.name)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No classes found for this grade
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {finalStudents.length === 0 ? (
        <EmptyState
          title="No students found"
          description="Get started by adding a new student"
          action={
            hasRole(["OWNER", "REGISTRAR"])
              ? {
                  label: "Add Student",
                  onClick: () =>
                    (window.location.href = "/dashboard/students/new"),
                }
              : undefined
          }
        />
      ) : (
        <>
          <StudentsTable
            students={finalStudents}
            onDelete={
              hasRole(["OWNER"])
                ? (student) => setDeleteDialog({ open: true, student })
                : undefined
            }
            onAssignClass={
              hasRole(["OWNER", "REGISTRAR"])
                ? (student) => setAssignDialog({ open: true, student })
                : undefined
            }
            onTransferClass={
              hasRole(["OWNER"])
                ? (student) => setTransferDialog({ open: true, student })
                : undefined
            }
            showActions={hasRole(["OWNER", "REGISTRAR"])}
          />

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, data.pagination.total)} of{" "}
                {data.pagination.total} students
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setPage((p) => Math.min(data.pagination!.totalPages, p + 1))
                  }
                  disabled={page === data.pagination!.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, student: deleteDialog.student })
        }
        title="Delete Student"
        description={`Are you sure you want to delete ${
          deleteDialog.student
            ? `${deleteDialog.student.firstName} ${deleteDialog.student.lastName}`
            : "this student"
        }? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="destructive"
      />

      <AssignClassDialog
        open={assignDialog.open}
        onOpenChange={(open) =>
          setAssignDialog({ open, student: assignDialog.student })
        }
        student={assignDialog.student}
        onConfirm={handleAssignClass}
        isLoading={assignClass.isPending}
      />

      <TransferClassDialog
        open={transferDialog.open}
        onOpenChange={(open) =>
          setTransferDialog({ open, student: transferDialog.student })
        }
        student={transferDialog.student}
        onConfirm={handleTransferClass}
        isLoading={transferClass.isPending}
      />
    </div>
  );
}
