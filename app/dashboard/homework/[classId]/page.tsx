"use client";

import { BackButton } from "@/components/shared/BackButton";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCalendarSystem } from "@/lib/context/calendar-context";
import { useClass } from "@/lib/hooks/use-classes";
import {
  useClassHomeworkDates,
  useClassHomeworkSummary,
  useHomeworkByClass,
} from "@/lib/hooks/use-homework";
import { useStudents } from "@/lib/hooks/use-students";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";
import { formatDateForUI } from "@/lib/utils/date";
import { formatFullName } from "@/lib/utils/format";
import { format } from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  History as HistoryIcon,
  Loader2,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { use, useMemo, useState } from "react";
import { toast } from "sonner";

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

  // Pagination state for display only
  const [page, setPage] = useState(1);
  const [limit] = useState(40);

  // Selected date for detailed view
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Filter state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  const { data: classData, isLoading: classLoading } = useClass(classId);

  // Fetch ALL students for homework display (no pagination)
  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    classId,
    classStatus: "assigned",
    page: 1,
    limit: 1000, // Large limit to get all students
  });

  const { data: datesData, isLoading: datesLoading } =
    useClassHomeworkDates(classId);
  const { data: summaryData, isLoading: summaryLoading } =
    useClassHomeworkSummary(classId);

  // Fetch detailed homework data for selected date
  const {
    data: homeworkData,
    isLoading: homeworkLoading,
    refetch: refetchHomework,
  } = useHomeworkByClass(classId, selectedDate, undefined);

  const availableDates = useMemo(() => {
    return datesData?.data || [];
  }, [datesData]);

  const displayDates = useMemo(() => {
    return availableDates.sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );
  }, [availableDates]);

  const summaryMap = useMemo(() => {
    const map = new Map<
      string,
      { done: number; not_done: number; total: number }
    >();
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

  // Students data processing
  const students = useMemo(() => {
    return studentsData?.data || [];
  }, [studentsData]);

  // Homework data processing for selected date
  const homeworkMap = useMemo(() => {
    const map = new Map<
      string,
      { status: string; notes?: string; title?: string }
    >();

    console.log("🔍 Processing homework data for date:", selectedDate);
    console.log("📊 Raw homework data:", homeworkData);

    if (homeworkData?.data?.students) {
      console.log(
        "👥 Number of students in homework data:",
        homeworkData.data.students.length,
      );

      homeworkData.data.students.forEach((item: any) => {
        // homework is an array - get the first or most relevant homework record
        const homeworkArray = item.homework || [];
        if (homeworkArray.length > 0) {
          // Use the first homework record (or you could add logic to choose by subject)
          const homework = homeworkArray[0];
          map.set(item.student.id, {
            status: homework.status || "not_done",
            notes: homework.notes || "",
            title: homework.title || "",
          });
          console.log(
            `✅ Student ${item.student.firstName} ${item.student.lastName}: ${homework.status}`,
          );
        } else {
          // No homework records for this student
          map.set(item.student.id, {
            status: "not_done",
            notes: "",
            title: "",
          });
          console.log(
            `❌ Student ${item.student.firstName} ${item.student.lastName}: no homework`,
          );
        }
      });

      // Count statuses for verification
      let doneCount = 0;
      let notDoneCount = 0;
      map.forEach((homework) => {
        if (homework.status === "done") doneCount++;
        else notDoneCount++;
      });
      console.log(`📈 Summary: ${doneCount} done, ${notDoneCount} not done`);
    }
    return map;
  }, [homeworkData, selectedDate]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((student) =>
        formatFullName(student.firstName, student.lastName)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((student) => {
        const homework = homeworkMap.get(student.id);
        return homework?.status === statusFilter;
      });
    }

    // Sort alphabetically
    return filtered.sort((a, b) =>
      formatFullName(a.firstName, a.lastName).localeCompare(
        formatFullName(b.firstName, b.lastName),
      ),
    );
  }, [students, searchTerm, statusFilter, homeworkMap]);

  const canViewHomework = hasRole(["TEACHER", "OWNER"]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setPage(1); // Reset to first page when changing date
  };

  const exportHomeworkData = async (exportType: "csv" | "pdf" = "csv") => {
    if (!selectedDate || !homeworkData?.data?.students) {
      toast.error("No homework data available for export");
      return;
    }

    try {
      setIsExporting(true);

      if (exportType === "csv") {
        handleCSVExport();
      } else {
        handlePDFExport();
      }

      toast.success(
        `Homework data exported successfully as ${exportType.toUpperCase()}`,
      );
    } catch (error: any) {
      console.error("Export failed:", error);
      toast.error("Export failed", {
        description: error.message || "An error occurred during export",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCSVExport = () => {
    const headers = [
      "No",
      "Student Name",
      "Class",
      "Homework Status",
      "Title",
      "Notes",
    ];

    const rows = filteredStudents.map((student, index) => {
      const homework = homeworkMap.get(student.id) || {
        status: "not_done",
        notes: "",
        title: "",
      };
      return [
        (index + 1).toString(),
        formatFullName(student.firstName, student.lastName).replace(/,/g, " "),
        classData?.data?.name || "Not Assigned",
        homework.status === "done" ? "Completed" : "Not Done",
        homework.title?.replace(/,/g, " ") || "-",
        homework.notes?.replace(/,/g, " ") || "-",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `homework-${classData?.data?.name || "class"}-${selectedDate}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePDFExport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const className = classData?.data?.name || "Not Assigned";
    const dateLabel = formatDateForUI(selectedDate, calendarSystem);

    const rows = filteredStudents
      .map((student, index) => {
        const homework = homeworkMap.get(student.id) || {
          status: "not_done",
          notes: "",
          title: "",
        };
        const statusClass =
          homework.status === "done" ? "text-green" : "text-red";
        const statusText =
          homework.status === "done" ? "Completed" : "Not Done";

        return `
        <tr>
          <td>${index + 1}</td>
          <td>${formatFullName(student.firstName, student.lastName)}</td>
          <td>${className}</td>
          <td class="${statusClass}">${statusText}</td>
          <td>${homework.title || "-"}</td>
          <td>${homework.notes || "-"}</td>
        </tr>
      `;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Homework Report - ${className} - ${dateLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; position: relative; }
            .header img { height: 60px; width: auto; margin-bottom: 5px; }
            h1 { margin: 0; font-size: 24px; color: #1e3a8a; }
            .school-name { font-size: 18px; font-weight: bold; color: #3b82f6; margin-bottom: 5px; }
            .developer-notice { font-size: 9px; color: #666; position: absolute; top: -15px; right: 0; font-style: italic; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f3f4f6; padding: 10px; text-align: left; border: 1px solid #ddd; font-size: 13px; }
            td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
            .text-green { color: #16a34a; font-weight: bold; }
            .text-red { color: #dc2626; font-weight: bold; }
            .summary { margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 5px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            @media print {
              body { margin: 0; }
              .header { border-bottom-color: #000; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="developer-notice">© 2ms deelopers 0962520885</div>
            <img src="/logo.jpg" alt="Logo" />
            <div class="school-name">DIGITAL KG</div>
            <h1>Homework Status Report</h1>
          </div>
          <div class="meta">
            <div>
              <p><strong>Class:</strong> ${className}</p>
              <p><strong>Due Date:</strong> ${dateLabel}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Report Date:</strong> ${formatDateForUI(new Date().toISOString(), calendarSystem)}</p>
              <p><strong>Total Students:</strong> ${filteredStudents.length}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Homework Status</th>
                <th>Title</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="summary">
            <div class="summary-row">
              <strong>Total Students:</strong> <span>${filteredStudents.length}</span>
            </div>
            <div class="summary-row">
              <strong>Completed:</strong> <span style="color: #16a34a; font-weight: bold;">
                ${Array.from(homeworkMap.values()).filter((h) => h.status === "done").length}
              </span>
            </div>
            <div class="summary-row">
              <strong>Not Done:</strong> <span style="color: #dc2626; font-weight: bold;">
                ${Array.from(homeworkMap.values()).filter((h) => h.status === "not_done").length}
              </span>
            </div>
            <div class="summary-row">
              <strong>Completion Rate:</strong> <span>
                ${
                  filteredStudents.length > 0
                    ? Math.round(
                        (Array.from(homeworkMap.values()).filter(
                          (h) => h.status === "done",
                        ).length /
                          filteredStudents.length) *
                          100,
                      )
                    : 0
                }%
              </span>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

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

  if (classLoading || datesLoading || summaryLoading || studentsLoading) {
    return <LoadingState />;
  }

  if (!classData?.data) {
    return <ErrorState title="Class not found" />;
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

      {/* Daily Summary Card */}
      <Card className="border shadow-sm border-slate-200">
        <CardHeader className="border-b bg-slate-50 border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HistoryIcon className="h-5 w-5 text-slate-600" />
              <div>
                <CardTitle className="text-slate-900">
                  Daily Homework Summary
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Click on any date to view detailed student records
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {summaryData?.data && summaryData.data.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Export summary data as CSV
                      const headers = [
                        "Date",
                        "Done",
                        "Not Done",
                        "Total",
                        "Completion Rate",
                      ];
                      const rows = summaryData.data.map((item) => [
                        format(new Date(item.date), "MMM dd, yyyy"),
                        item.done.toString(),
                        item.not_done.toString(),
                        item.total.toString(),
                        `${Math.round((item.done / item.total) * 100)}%`,
                      ]);
                      const csvContent = [
                        headers.join(","),
                        ...rows.map((r) =>
                          r.map((cell) => `"${cell}"`).join(","),
                        ),
                      ].join("\n");
                      const blob = new Blob([csvContent], {
                        type: "text/csv;charset=utf-8;",
                      });
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(blob);
                      link.setAttribute("download", `homework-summary.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Export summary data as PDF
                      const printWindow = window.open("", "_blank");
                      if (!printWindow) return;

                      const className = classData?.data?.name || "Not Assigned";
                      const rows = summaryData.data
                        .map((item, index) => {
                          const completionRate = Math.round(
                            (item.done / item.total) * 100,
                          );
                          const rateClass =
                            completionRate >= 80
                              ? "text-green"
                              : completionRate >= 50
                                ? "text-yellow"
                                : "text-red";

                          return `
                          <tr>
                            <td>${index + 1}</td>
                            <td>${format(new Date(item.date), "MMM dd, yyyy")}</td>
                            <td style="text-align: center; color: #16a34a; font-weight: bold;">${item.done}</td>
                            <td style="text-align: center; color: #dc2626; font-weight: bold;">${item.not_done}</td>
                            <td style="text-align: center;">${item.total}</td>
                            <td style="text-align: center;">
                              <span class="${rateClass}">${completionRate}%</span>
                            </td>
                          </tr>
                        `;
                        })
                        .join("");

                      const htmlContent = `
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Homework Summary Report - ${className}</title>
                            <style>
                              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; position: relative; }
                              .header img { height: 60px; width: auto; margin-bottom: 5px; }
                              h1 { margin: 0; font-size: 24px; color: #1e3a8a; }
                              .school-name { font-size: 18px; font-weight: bold; color: #3b82f6; margin-bottom: 5px; }
                              .developer-notice { font-size: 9px; color: #666; position: absolute; top: -15px; right: 0; font-style: italic; }
                              .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
                              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                              th { background-color: #f3f4f6; padding: 10px; text-align: left; border: 1px solid #ddd; font-size: 13px; }
                              td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
                              .text-green { color: #16a34a; font-weight: bold; }
                              .text-yellow { color: #ca8a04; font-weight: bold; }
                              .text-red { color: #dc2626; font-weight: bold; }
                              .summary { margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 5px; }
                              @media print {
                                body { margin: 0; }
                                .header { border-bottom-color: #000; }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <div class="developer-notice">© 2ms deelopers 0962520885</div>
                              <img src="/logo.jpg" alt="Logo" />
                              <div class="school-name">DIGITAL KG</div>
                              <h1>Homework Summary Report</h1>
                            </div>
                            <div class="meta">
                              <div>
                                <p><strong>Class:</strong> ${className}</p>
                                <p><strong>Report Period:</strong> All Dates</p>
                              </div>
                              <div style="text-align: right;">
                                <p><strong>Report Date:</strong> ${formatDateForUI(new Date().toISOString(), calendarSystem)}</p>
                                <p><strong>Total Dates:</strong> ${summaryData.data.length}</p>
                              </div>
                            </div>
                            <table>
                              <thead>
                                <tr>
                                  <th style="width: 40px;">No</th>
                                  <th>Due Date</th>
                                  <th style="text-align: center; width: 60px;">Done</th>
                                  <th style="text-align: center; width: 60px;">Not Done</th>
                                  <th style="text-align: center; width: 60px;">Total</th>
                                  <th style="text-align: center; width: 80px;">Completion</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${rows}
                              </tbody>
                            </table>
                            <div class="summary">
                              <p><strong>Report Summary:</strong> This report shows homework completion statistics for ${summaryData.data.length} dates.</p>
                            </div>
                          </body>
                        </html>
                      `;

                      printWindow.document.write(htmlContent);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => {
                        printWindow.print();
                      }, 500);
                    }}
                    className="text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Export PDF
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {availableDates.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center">
              <HistoryIcon className="h-6 w-6 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-900">
                No History Found
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-slate-200">
                      <TableHead className="w-12 h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-center">
                        #
                      </TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        Due Date
                      </TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-center w-20">
                        Done
                      </TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-center w-20">
                        Not Done
                      </TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-center w-20">
                        Total
                      </TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-right pr-6">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayDates
                      .slice((page - 1) * limit, page * limit)
                      .map((date, idx) => {
                        const isSelected = date === selectedDate;
                        const stats = summaryMap.get(date.split("T")[0]) ||
                          summaryMap.get(date) || {
                            done: 0,
                            not_done: 0,
                            total: students.length,
                          };

                        return (
                          <TableRow
                            key={date}
                            className={cn(
                              "group transition-colors border-slate-100",
                              isSelected
                                ? "bg-blue-50/50"
                                : "hover:bg-slate-50/30",
                            )}
                          >
                            <TableCell className="text-center py-3 font-mono text-[10px] text-slate-400">
                              {String((page - 1) * limit + idx + 1).padStart(
                                2,
                                "0",
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "p-1.5 rounded-md",
                                    isSelected
                                      ? "bg-blue-600 text-white"
                                      : "bg-slate-100 text-slate-500",
                                  )}
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                  <p
                                    className={cn(
                                      "text-xs font-bold",
                                      isSelected
                                        ? "text-blue-700"
                                        : "text-slate-900",
                                    )}
                                  >
                                    {formatDateForUI(date, calendarSystem)}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    {stats.total} Students
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xs font-bold text-green-600">
                                  {stats.done}
                                </span>
                                <div className="w-8 h-1 rounded-full bg-green-100" />
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xs font-bold text-red-600">
                                  {stats.not_done}
                                </span>
                                <div className="w-8 h-1 rounded-full bg-red-100" />
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xs font-bold text-slate-600">
                                  {stats.total}
                                </span>
                                <div className="w-8 h-1 rounded-full bg-slate-100" />
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-right pr-6">
                              <Button
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleDateChange(date)}
                                className={cn(
                                  "h-7 text-[10px] font-bold px-3 transition-all",
                                  isSelected
                                    ? "bg-blue-600 hover:bg-blue-700"
                                    : "text-slate-600",
                                )}
                              >
                                {isSelected ? "Active" : "View"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Page <span className="text-slate-900">{page}</span> /{" "}
                  {Math.ceil(displayDates.length / limit)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 px-3 text-xs font-bold text-slate-600"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Prev
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setPage((p) =>
                        Math.min(Math.ceil(displayDates.length / limit), p + 1),
                      )
                    }
                    disabled={page === Math.ceil(displayDates.length / limit)}
                    className="h-8 px-3 text-xs font-bold text-slate-600"
                  >
                    Next
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students Homework Table - Only show when date is selected */}
      {selectedDate && (
        <Card className="border shadow-sm border-slate-200">
          <CardHeader className="border-b bg-slate-50 border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-slate-600" />
                <div>
                  <CardTitle className="text-slate-900">
                    Students Homework
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    {filteredStudents.length}{" "}
                    {filteredStudents.length === 1 ? "student" : "students"} in
                    class
                    {" • "} {formatDateForUI(selectedDate, calendarSystem)}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportHomeworkData("csv")}
                  className="text-xs"
                  disabled={filteredStudents.length === 0 || isExporting}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportHomeworkData("pdf")}
                  className="text-xs"
                  disabled={filteredStudents.length === 0 || isExporting}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3 mr-1" />
                      Export PDF
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="flex-1">
                <Label className="text-xs font-medium text-slate-700 mb-1 block">
                  Search Students
                </Label>
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="w-full sm:w-48">
                <Label className="text-xs font-medium text-slate-700 mb-1 block">
                  Status Filter
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="done">Completed</SelectItem>
                    <SelectItem value="not_done">Not Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {homeworkLoading ? (
              <div className="p-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600 mx-auto mb-4" />
                <p className="text-sm font-medium text-slate-500">
                  Loading homework data...
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center">
                <Users className="h-6 w-6 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-900">
                  No students found
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-slate-200">
                      <TableHead className="w-12 h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-center">
                        #
                      </TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        Student Name
                      </TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        Status
                      </TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        Title
                      </TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        Notes
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student, index) => {
                      const homework = homeworkMap.get(student.id) || {
                        status: "not_done",
                        notes: "",
                        title: "",
                      };
                      const statusColor =
                        homework.status === "done"
                          ? "text-green-600"
                          : "text-red-600";
                      const statusBg =
                        homework.status === "done"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-red-100 text-red-700 border-red-200";

                      return (
                        <TableRow
                          key={student.id}
                          className="group transition-colors border-slate-100 hover:bg-slate-50/30"
                        >
                          <TableCell className="text-center py-3 font-mono text-[10px] text-slate-400">
                            {String(index + 1).padStart(2, "0")}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-slate-600">
                                  {formatFullName(
                                    student.firstName,
                                    student.lastName,
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {formatFullName(
                                    student.firstName,
                                    student.lastName,
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {classData?.data?.name || "Not Assigned"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge
                              className={cn("text-xs font-bold", statusBg)}
                            >
                              {homework.status === "done"
                                ? "✓ Completed"
                                : "✗ Not Done"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-sm text-slate-900">
                              {homework.title || "-"}
                            </p>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-sm text-slate-600">
                              {homework.notes || "-"}
                            </p>
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
      )}
    </div>
  );
}
