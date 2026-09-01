"use client";

import { ArchiveModeBanner } from "@/components/shared/ArchiveModeBanner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAcademicYearContext } from "@/lib/hooks/use-academic-year-context";
import { useGraduates } from "@/lib/hooks/use-graduates";
import {
  formatClassDisplayName,
  formatFullName,
} from "@/lib/utils/format";
import { Award, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function GraduatesPage() {
  const { academicYearId, academicYears, isArchiveMode } =
    useAcademicYearContext();
  const [page, setPage] = useState(1);
  const [limit] = useState(40);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (academicYearId && !yearFilter) {
      setYearFilter(academicYearId);
    }
  }, [academicYearId, yearFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, yearFilter]);

  const { data, isLoading, error, refetch } = useGraduates({
    page,
    limit,
    search: debouncedSearch.trim() || undefined,
    academicYearId: yearFilter && yearFilter !== "all" ? yearFilter : undefined,
  });

  const graduates = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  if (error) {
    return <ErrorState message="Failed to load graduates" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-7 w-7" />
            Graduates
          </h1>
          <p className="text-muted-foreground mt-1">
            Alumni who completed the highest grade. Not included in live attendance or fee collection.
          </p>
        </div>
      </div>

      <ArchiveModeBanner />

      <Card>
        <CardHeader>
          <CardTitle>Alumni List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={yearFilter || "all"}
              onValueChange={setYearFilter}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Graduation year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                    {year.status === "CLOSED" ? " (archived)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <LoadingState rows={5} columns={4} />
          ) : graduates.length === 0 ? (
            <EmptyState
              title="No graduates found"
              description={
                isArchiveMode
                  ? "No alumni records for this archived year."
                  : "Graduates appear here after promotion from the highest grade."
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Last Class</TableHead>
                    <TableHead>Graduation Year</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {graduates.map((student) => {
                    const lastClass = student.classHistory?.[0]?.class;
                    const yearName =
                      typeof lastClass?.academicYear === "object"
                        ? lastClass.academicYear?.name
                        : typeof lastClass?.academicYear === "string"
                          ? lastClass.academicYear
                          : undefined;

                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/students/${student.id}`}
                            className="font-medium hover:underline"
                          >
                            {formatFullName(student.firstName, student.lastName)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {lastClass?.name
                            ? formatClassDisplayName(lastClass.name)
                            : "—"}
                        </TableCell>
                        <TableCell>{yearName || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Graduated</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-sm underline disabled:opacity-50"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="text-sm underline disabled:opacity-50"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
