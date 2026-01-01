"use client";

import { useState } from "react";
import { useStudents, useDeleteStudent } from "@/lib/hooks/use-students";
import { StudentsTable } from "@/components/tables/StudentsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [classStatusFilter, setClassStatusFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    student: Student | null;
  }>({
    open: false,
    student: null,
  });

  const { data, isLoading, error, refetch } = useStudents({
    page,
    limit,
    classStatus:
      classStatusFilter !== "all"
        ? (classStatusFilter as "new" | "assigned")
        : undefined,
    paymentStatus:
      paymentStatusFilter !== "all"
        ? (paymentStatusFilter as "pending" | "confirmed")
        : undefined,
  });

  const deleteStudent = useDeleteStudent();

  const handleDelete = async () => {
    if (deleteDialog.student) {
      await deleteStudent.mutateAsync(deleteDialog.student.id);
      setDeleteDialog({ open: false, student: null });
    }
  };

  // Filter students by search term
  const students = Array.isArray(data?.data) ? data.data : [];
  const filteredStudents =
    students.filter((student: Student) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        student.firstName.toLowerCase().includes(searchLower) ||
        student.lastName.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower) ||
        student.phone?.toLowerCase().includes(searchLower)
      );
    }) || [];

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
          <h1 className="text-page-title">Students</h1>
          <p className="text-body text-muted-foreground mt-1">
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
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
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
            <Select
              value={paymentStatusFilter}
              onValueChange={setPaymentStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredStudents.length === 0 ? (
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
            students={filteredStudents}
            onDelete={
              hasRole(["OWNER"])
                ? (student) => setDeleteDialog({ open: true, student })
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
    </div>
  );
}
