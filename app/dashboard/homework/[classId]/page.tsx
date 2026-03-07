"use client";

import { BackButton } from "@/components/shared/BackButton";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCalendarSystem } from "@/lib/context/calendar-context";
import {
  useClassHomeworkDates,
  useClassHomeworkSummary,
} from "@/lib/hooks/use-homework";
import { useClass } from "@/lib/hooks/use-classes";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";
import { formatDateForUI } from "@/lib/utils/date";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { use, useMemo } from "react";

export default function HomeworkHistoryPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  const searchParams = useSearchParams();
  const { hasRole } = useAuthStore();
  const { calendarSystem } = useCalendarSystem();

  const isHistoryMode = searchParams.get("history") === "true";

  const { data: classData, isLoading: classLoading } = useClass(classId);

  const {
    data: datesData,
    isLoading: datesLoading,
  } = useClassHomeworkDates(classId);
  const {
    data: summaryData,
    isLoading: summaryLoading,
  } = useClassHomeworkSummary(classId);

  const availableDates = useMemo(() => {
    return datesData?.data || [];
  }, [datesData]);

  const summaryMap = useMemo(() => {
    const map = new Map<string, { done: number; not_done: number; total: number }>();
    if (summaryData?.data) {
      summaryData.data.forEach((item) => {
        map.set(item.date, {
          done: item.done,
          not_done: item.not_done,
          total: item.total,
        });
      });
    }
    return map;
  }, [summaryData]);

  const canViewHomework = hasRole(["TEACHER", "OWNER"]);

  if (!canViewHomework) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                You don't have permission to view homework history.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (classLoading || datesLoading || summaryLoading) {
    return <LoadingState />;
  }

  if (!classData?.data) {
    return <ErrorState error="Class not found" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Homework History</h1>
          <p className="text-muted-foreground">
            {classData.data.name} - Summary by Due Date
          </p>
        </div>
        <BackButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Summary</CardTitle>
          <CardDescription>
            Homework completion statistics grouped by date
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableDates.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                No homework records found for this class.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Date</TableHead>
                    <TableHead>Done</TableHead>
                    <TableHead>Not Done</TableHead>
                    <TableHead>Total Students</TableHead>
                    <TableHead>Completion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableDates.map((dateStr) => {
                    const stats = summaryMap.get(dateStr);
                    if (!stats) return null;

                    const completionRate =
                      stats.total > 0
                        ? Math.round((stats.done / stats.total) * 100)
                        : 0;

                    return (
                      <TableRow key={dateStr}>
                        <TableCell className="font-medium">
                          {formatDateForUI(dateStr, calendarSystem)}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            {stats.done}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            {stats.not_done}
                          </Badge>
                        </TableCell>
                        <TableCell>{stats.total}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[100px]">
                              <div
                                className={cn(
                                  "h-2 rounded-full",
                                  completionRate >= 80
                                    ? "bg-green-500"
                                    : completionRate >= 50
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                )}
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {completionRate}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
