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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useAttendanceByClass,
  useBulkAttendance,
  useClassAttendanceDates,
  useClassAttendanceSummary,
  useUpdateAttendance,
} from "@/lib/hooks/use-attendance";
import { useClass } from "@/lib/hooks/use-classes";
import { useStudents } from "@/lib/hooks/use-students";
import { useAuthStore } from "@/lib/store/auth-store";
import { AttendanceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateForUI } from "@/lib/utils/date";
import { formatFullName } from "@/lib/utils/format";
import { format } from "date-fns";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  History as HistoryIcon,
  Printer,
  Save,
  Users,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";

export default function AttendanceBulkPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasRole } = useAuthStore();
  const { calendarSystem } = useCalendarSystem();

  // Get date from URL or default to today
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const isHistoryMode = searchParams.get("history") === "true";

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const { data: classData, isLoading: classLoading } = useClass(classId);
  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    classId,
    classStatus: "assigned",
    page,
    limit,
  });

  // Get available dates for history
  const { data: datesData, isLoading: datesLoading, refetch: refetchDates, error: datesError } = useClassAttendanceDates(classId);
  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useClassAttendanceSummary(classId);

  const availableDates = useMemo(() => {
    if (!datesData?.data) return [];
    const dates = Array.isArray(datesData.data) ? datesData.data : [];
    // Filter out any invalid dates and sort: latest first
    const validDates = dates.filter(date => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    });
    return validDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [datesData]);

  // Create a map of date -> summary stats for quick lookup
  const summaryMap = useMemo(() => {
    if (!summaryData?.data) return new Map();
    const map = new Map();
    summaryData.data.forEach((item) => {
      // Normalize date to YYYY-MM-DD format for consistent lookup
      const normalizedDate = item.date.split('T')[0];
      map.set(normalizedDate, item);
      // Also set with original date format for compatibility
      map.set(item.date, item);
    });
    return map;
  }, [summaryData]);

  // Use summary dates as primary source, fallback to availableDates
  const displayDates = useMemo(() => {
    if (summaryData?.data && summaryData.data.length > 0) {
      // Extract dates from summary data and normalize to YYYY-MM-DD
      return summaryData.data.map(item => {
        const date = item.date.split('T')[0];
        return date;
      }).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }
    return availableDates;
  }, [summaryData, availableDates]);

  // Get latest date from display dates for default
  const latestDate = displayDates.length > 0 ? displayDates[0] : todayStr;

  const [selectedDate, setSelectedDate] = useState<string>(
    searchParams.get("date") || (isHistoryMode ? latestDate : todayStr)
  );

  // Reset page when class changes or mode changes
  useEffect(() => {
    setPage(1);
  }, [classId, isHistoryMode]);

  // Refetch dates when component mounts or classId changes
  useEffect(() => {
    if (classId && isHistoryMode) {
      refetchDates();
    }
  }, [classId, isHistoryMode, refetchDates]);

  // Update selected date to latest when in history mode and dates are loaded
  useEffect(() => {
    if (
      isHistoryMode &&
      displayDates.length > 0 &&
      !searchParams.get("date")
    ) {
      const latest = displayDates[0];
      if (latest && latest !== selectedDate) {
        setSelectedDate(latest);
        router.push(
          `/dashboard/attendance/${classId}?date=${latest}&history=true`,
          { scroll: false }
        );
      }
    }
  }, [
    isHistoryMode,
    displayDates,
    classId,
    router,
    searchParams,
    selectedDate,
  ]);

  // Sync selectedDate with URL params
  useEffect(() => {
    const urlDate = searchParams.get("date");
    if (urlDate && urlDate !== selectedDate) {
      setSelectedDate(urlDate);
    }
  }, [searchParams, selectedDate]);

  const { data: attendanceData, isLoading: attendanceLoading, refetch: refetchAttendance } =
    useAttendanceByClass(classId, selectedDate);

  // Force refetch when selectedDate changes
  useEffect(() => {
    if (selectedDate && classId) {
      refetchAttendance();
    }
  }, [selectedDate, classId, refetchAttendance]);
  const bulkAttendance = useBulkAttendance();
  const updateAttendance = useUpdateAttendance();

  // Prepare students data for memoization
  const students = useMemo(() => {
    return Array.isArray(studentsData?.data) ? studentsData.data : [];
  }, [studentsData?.data]);

  // Calculate attendance statistics for the currently selected date
  const currentDateStats = useMemo(() => {
    if (!attendanceData?.data || !studentsData?.data) {
      return { present: 0, absent: 0, late: 0, total: students.length };
    }

    let attendanceRecords: any[] = [];
    if (Array.isArray(attendanceData.data)) {
      attendanceRecords = attendanceData.data;
    } else if (attendanceData.data.students) {
      attendanceRecords = attendanceData.data.students
        .map((item: any) => ({
          ...item.attendance,
          studentId: item.student?.id || item.attendance?.studentId,
        }))
        .filter((item: any) => item && item.id);
    }

    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      total: students.length,
    };

    attendanceRecords.forEach((record: any) => {
      if (record.status === "present") stats.present++;
      else if (record.status === "absent") stats.absent++;
      else if (record.status === "late") stats.late++;
    });

    return stats;
  }, [attendanceData, studentsData, students]);

  const [attendanceStates, setAttendanceStates] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [attendanceIds, setAttendanceIds] = useState<Record<string, string>>(
    {}
  );
  const [attendanceNotes, setAttendanceNotes] = useState<
    Record<string, string>
  >({});
  const [hasChanges, setHasChanges] = useState(false);

  // Update URL when date changes
  const handleDateChange = (newDate: string) => {
    if (newDate === selectedDate) return; // Prevent unnecessary updates
    setSelectedDate(newDate);
    setHasChanges(false);
    const historyParam = isHistoryMode ? "&history=true" : "";
    router.push(
      `/dashboard/attendance/${classId}?date=${newDate}${historyParam}`,
      { scroll: false }
    );
  };

  // Date navigation helpers
  const navigateDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDateStr = currentDate.toISOString().split("T")[0];
    handleDateChange(newDateStr);
  };

  const goToToday = () => {
    handleDateChange(todayStr);
  };

  const goToYesterday = () => {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    handleDateChange(yesterday.toISOString().split("T")[0]);
  };

  const goToLastMonth = () => {
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    handleDateChange(lastMonth.toISOString().split("T")[0]);
  };

  // Initialize attendance states from existing data or default to 'present'
  useEffect(() => {
    if (attendanceData?.data && studentsData?.data) {
      const states: Record<string, AttendanceStatus> = {};
      const ids: Record<string, string> = {};
      const notes: Record<string, string> = {};

      // Backend returns { class, date, students: [{ student, attendance }] }
      // Frontend API might return array or object, handle both
      let attendanceRecords: any[] = [];

      if (Array.isArray(attendanceData.data)) {
        // If it's an array, use it directly
        attendanceRecords = attendanceData.data;
      } else if (attendanceData.data.students) {
        // If it's an object with students array
        attendanceRecords = attendanceData.data.students
          .map((item: any) => ({
            ...item.attendance,
            studentId: item.student?.id || item.attendance?.studentId,
          }))
          .filter((item: any) => item && item.id);
      }

      studentsData.data.forEach((student) => {
        const existing = attendanceRecords.find(
          (a: any) =>
            a.studentId === student.id ||
            (a.student && a.student.id === student.id)
        );

        if (existing && existing.id) {
          states[student.id] = existing.status || "present";
          ids[student.id] = existing.id;
          notes[student.id] = existing.notes || "";
        } else {
          states[student.id] = "present";
          notes[student.id] = "";
        }
      });

      setAttendanceStates(states);
      setAttendanceIds(ids);
      setAttendanceNotes(notes);
      setHasChanges(false);
    } else if (studentsData?.data) {
      const states: Record<string, AttendanceStatus> = {};
      const notes: Record<string, string> = {};
      studentsData.data.forEach((student) => {
        states[student.id] = "present";
        notes[student.id] = "";
      });
      setAttendanceStates(states);
      setAttendanceIds({});
      setAttendanceNotes(notes);
      setHasChanges(false);
    }
  }, [attendanceData, studentsData, selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceStates((prev) => ({ ...prev, [studentId]: status }));
    // Clear notes if status changes to present
    if (status === "present") {
      setAttendanceNotes((prev) => ({ ...prev, [studentId]: "" }));
    }
    setHasChanges(true);
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendanceNotes((prev) => ({ ...prev, [studentId]: notes }));
    setHasChanges(true);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (studentsData?.data) {
      const states: Record<string, AttendanceStatus> = {};
      studentsData.data.forEach((student) => {
        states[student.id] = status;
      });
      setAttendanceStates(states);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    if (!studentsData?.data) return;

    const attendanceData = studentsData.data.map((student) => {
      const status = attendanceStates[student.id] || "present";
      return {
        studentId: student.id,
        status,
        notes:
          status === "late" || status === "absent"
            ? attendanceNotes[student.id] || ""
            : "",
      };
    });

    await bulkAttendance.mutateAsync({
      classId,
      date: selectedDate,
      attendanceData,
    });

    // After saving, move to the next date
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const nextDateStr = currentDate.toISOString().split("T")[0];
    handleDateChange(nextDateStr);

    // Reset attendance states for the new date
    if (studentsData.data) {
      const states: Record<string, AttendanceStatus> = {};
      const notes: Record<string, string> = {};
      studentsData.data.forEach((student) => {
        states[student.id] = "present";
        notes[student.id] = "";
      });
      setAttendanceStates(states);
      setAttendanceNotes(notes);
    }
  };

  const handleUpdate = async () => {
    if (!studentsData?.data) return;

    // Get original attendance records
    let attendanceRecords: any[] = [];
    if (Array.isArray(attendanceData?.data)) {
      attendanceRecords = attendanceData.data;
    } else if (attendanceData?.data?.students) {
      attendanceRecords = attendanceData.data.students
        .map((item: any) => ({
          ...item.attendance,
          studentId: item.student?.id || item.attendance?.studentId,
        }))
        .filter((item: any) => item && item.id);
    }

    // Update each attendance record that has changed
    const updatePromises = studentsData.data.map(async (student) => {
      const currentStatus = attendanceStates[student.id] || "present";
      const currentNotes =
        currentStatus === "late" || currentStatus === "absent"
          ? attendanceNotes[student.id] || ""
          : "";
      const attendanceId = attendanceIds[student.id];

      if (attendanceId) {
        const existing = attendanceRecords.find(
          (a: any) =>
            a.studentId === student.id ||
            (a.student && a.student.id === student.id) ||
            a.id === attendanceId
        );

        if (existing) {
          const originalStatus = existing.status;
          const originalNotes = existing.notes || "";

          // Update if status or notes changed
          if (
            currentStatus !== originalStatus ||
            currentNotes !== originalNotes
          ) {
            return updateAttendance.mutateAsync({
              id: attendanceId,
              data: {
                status: currentStatus,
                notes: currentNotes,
              },
            });
          }
        }
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);
    setHasChanges(false);
  };

  // Role-based access control
  const canMarkAttendance = hasRole(["TEACHER"]);
  const canViewHistory = hasRole(["TEACHER", "OWNER"]);

  // Sort students alphabetically by first name (A, B, C...) - must be called before early returns
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      return (a.firstName || "").localeCompare(b.firstName || "");
    });
  }, [students]);

  // In history mode, show all recorded dates without restrictions
  const isHistory = isHistoryMode;

  // If user doesn't have permission, show error
  if (!canViewHistory) {
    return (
      <ErrorState message="You don't have permission to view attendance. Only teachers and owners can access this page." />
    );
  }

  if (classLoading || studentsLoading || attendanceLoading) {
    return <LoadingState rows={10} columns={3} />;
  }

  if (!classData?.data || !studentsData?.data) {
    return <ErrorState message="Failed to load class or students" />;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton href="/dashboard/attendance" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg border bg-slate-50 border-slate-200">
              {isHistory ? (
                <HistoryIcon className="h-8 w-8 text-slate-700" />
              ) : (
                <Calendar className="h-8 w-8 text-slate-700" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {isHistory ? "Attendance History" : "Mark Attendance"}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {classData.data.name} • {formatDateForUI(selectedDate, calendarSystem)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isHistory && (
            <Button
              onClick={() => {
                // Navigate to history mode with current date
                router.push(
                  `/dashboard/attendance/${classId}?date=${selectedDate}&history=true`
                );
              }}
              variant="outline"
              size="sm"
            >
              <HistoryIcon className="mr-2 h-4 w-4" />
              View History
            </Button>
          )}
          {isHistory && (
            <Badge
              variant="secondary"
              className="bg-slate-100 text-slate-700 border-slate-300"
            >
              <HistoryIcon className="h-3 w-3 mr-1" />
              Viewing History
            </Badge>
          )}
        </div>
      </div>

      {/* Date Navigation Card */}
      <Card className="border shadow-sm border-slate-200">
        <CardHeader className="border-b bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-slate-900">
              Date Selection
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {isHistory ? (
              /* History Mode: Show table with attendance statistics */
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label className="text-slate-800 font-semibold text-base">
                        Daily Attendance Summary
                      </Label>
                      <p className="text-xs text-slate-500 mt-1">
                        Click on any date to view detailed student records
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          refetchDates();
                          refetchSummary();
                        }}
                        disabled={datesLoading || summaryLoading}
                        className="text-xs"
                      >
                        {datesLoading || summaryLoading ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 mr-2" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <HistoryIcon className="h-3 w-3 mr-1" />
                            Refresh
                          </>
                        )}
                      </Button>
                      {summaryData?.data && summaryData.data.length > 0 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Export to CSV
                              const headers = ['Date', 'Present', 'Absent', 'Late', 'Total'];
                              const rows = summaryData.data.map((item) => [
                                format(new Date(item.date), 'MMM dd, yyyy'),
                                item.present.toString(),
                                item.absent.toString(),
                                item.late.toString(),
                                item.total.toString(),
                              ]);
                              const csvContent = [
                                headers.join(','),
                                ...rows.map(row => row.join(',')),
                              ].join('\n');
                              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                              const link = document.createElement('a');
                              const url = URL.createObjectURL(blob);
                              link.setAttribute('href', url);
                              link.setAttribute('download', `attendance-summary-${classData?.data?.name || 'class'}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
                              link.style.visibility = 'hidden';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="text-xs"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Print
                              if (!summaryData?.data || !classData?.data) return;
                              const printWindow = window.open('', '_blank');
                              if (!printWindow) return;
                              const dateRows = summaryData.data.map((item) => {
                                const date = new Date(item.date);
                                return `
                                  <tr>
                                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${format(date, 'MMM dd, yyyy')}</td>
                                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; color: #16a34a; font-weight: 600;">${item.present}</td>
                                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; color: #dc2626; font-weight: 600;">${item.absent}</td>
                                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; color: #ca8a04; font-weight: 600;">${item.late}</td>
                                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${item.total}</td>
                                  </tr>
                                `;
                              }).join('');
                              const totalPresent = summaryData.data.reduce((sum, item) => sum + item.present, 0);
                              const totalAbsent = summaryData.data.reduce((sum, item) => sum + item.absent, 0);
                              const totalLate = summaryData.data.reduce((sum, item) => sum + item.late, 0);
                              const totalDays = summaryData.data.length;
                              const avgTotal = summaryData.data.length > 0 ? Math.round(summaryData.data.reduce((sum, item) => sum + item.total, 0) / summaryData.data.length) : 0;
                              const htmlContent = `
                                <!DOCTYPE html>
                                <html>
                                  <head>
                                    <title>Daily Attendance Summary - ${classData.data.name}</title>
                                    <style>
                                      body {
                                        font-family: Arial, sans-serif;
                                        margin: 20px;
                                        color: #000;
                                      }
                                      h1 {
                                        color: #1f2937;
                                        border-bottom: 2px solid #3b82f6;
                                        padding-bottom: 10px;
                                        margin-bottom: 20px;
                                      }
                                      table {
                                        width: 100%;
                                        border-collapse: collapse;
                                        margin-top: 20px;
                                      }
                                      th {
                                        background-color: #f3f4f6;
                                        padding: 12px;
                                        text-align: left;
                                        border: 1px solid #ddd;
                                        font-weight: bold;
                                      }
                                      td {
                                        padding: 8px;
                                        border: 1px solid #ddd;
                                      }
                                      .summary {
                                        margin-top: 30px;
                                        padding: 15px;
                                        background-color: #f9fafb;
                                        border: 1px solid #ddd;
                                      }
                                      .summary h2 {
                                        margin-top: 0;
                                        color: #1f2937;
                                      }
                                      .summary-row {
                                        display: flex;
                                        justify-content: space-between;
                                        padding: 8px 0;
                                        border-bottom: 1px solid #e5e7eb;
                                      }
                                      @media print {
                                        body { margin: 0; }
                                        .no-print { display: none; }
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <h1>Daily Attendance Summary - ${classData.data.name}</h1>
                                    <p><strong>Generated:</strong> ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
                                    <table>
                                      <thead>
                                        <tr>
                                          <th>Date</th>
                                          <th style="text-align: right;">Present</th>
                                          <th style="text-align: right;">Absent</th>
                                          <th style="text-align: right;">Late</th>
                                          <th style="text-align: right;">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        ${dateRows}
                                        <tr style="background-color: #f3f4f6; font-weight: bold;">
                                          <td style="padding: 10px; border: 1px solid #e5e7eb;">Total</td>
                                          <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; color: #16a34a;">${totalPresent}</td>
                                          <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; color: #dc2626;">${totalAbsent}</td>
                                          <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; color: #ca8a04;">${totalLate}</td>
                                          <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">${avgTotal * totalDays}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                    <div class="summary">
                                      <h2>Summary</h2>
                                      <div class="summary-row">
                                        <span><strong>Total Days Recorded:</strong></span>
                                        <span>${totalDays}</span>
                                      </div>
                                      <div class="summary-row">
                                        <span><strong>Total Present:</strong></span>
                                        <span>${totalPresent}</span>
                                      </div>
                                      <div class="summary-row">
                                        <span><strong>Total Absent:</strong></span>
                                        <span>${totalAbsent}</span>
                                      </div>
                                      <div class="summary-row">
                                        <span><strong>Total Late:</strong></span>
                                        <span>${totalLate}</span>
                                      </div>
                                      <div class="summary-row">
                                        <span><strong>Average Students per Day:</strong></span>
                                        <span>${avgTotal}</span>
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
                              }, 250);
                            }}
                            className="text-xs"
                          >
                            <Printer className="h-3 w-3 mr-1" />
                            Print
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {datesLoading ? (
                    <div className="p-8 border border-slate-200 rounded-md bg-slate-50 text-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Loading attendance dates...</p>
                    </div>
                  ) : datesError ? (
                    <div className="p-4 border border-red-200 rounded-md bg-red-50">
                      <p className="text-sm text-red-600">
                        Failed to load attendance dates. Please try refreshing.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          refetchDates();
                          refetchSummary();
                        }}
                        className="mt-2"
                      >
                        Retry
                      </Button>
                    </div>
                  ) : (summaryLoading || datesLoading) ? (
                    <div className="p-8 border border-slate-200 rounded-md bg-slate-50 text-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-transparent mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Loading attendance summary...</p>
                    </div>
                  ) : (displayDates.length > 0 || (summaryData?.data && summaryData.data.length > 0)) ? (
                    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="font-semibold text-slate-700">Date</TableHead>
                            <TableHead className="font-semibold text-slate-700 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Check className="h-4 w-4 text-green-600" />
                                <span>Present</span>
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold text-slate-700 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <X className="h-4 w-4 text-red-600" />
                                <span>Absent</span>
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold text-slate-700 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Clock className="h-4 w-4 text-yellow-600" />
                                <span>Late</span>
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold text-slate-700 text-center">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayDates
                            .slice((page - 1) * limit, page * limit)
                            .map((date) => {
                              const isSelected = date === selectedDate;
                              // Normalize date for lookup (ensure YYYY-MM-DD format)
                              const normalizedDate = date.split('T')[0];
                              const summary = summaryMap.get(normalizedDate) || summaryMap.get(date);
                              const stats = summary || { present: 0, absent: 0, late: 0, total: students.length };

                              return (
                                <TableRow
                                  key={date}
                                  className={cn(
                                    "cursor-pointer hover:bg-slate-50 transition-colors",
                                    isSelected && "bg-blue-50 border-l-4 border-l-blue-600"
                                  )}
                                  onClick={() => handleDateChange(date)}
                                >
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-slate-500" />
                                      <span>{formatDateForUI(date, calendarSystem)}</span>
                                      {isSelected && (
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs border-blue-200">
                                          Viewing
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-green-50 text-green-700 font-semibold text-sm border border-green-200">
                                      {stats.present}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-red-50 text-red-700 font-semibold text-sm border border-red-200">
                                      {stats.absent}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-yellow-50 text-yellow-700 font-semibold text-sm border border-yellow-200">
                                      {stats.late}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center font-semibold text-slate-700">
                                    {stats.total}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                        <p className="text-sm text-slate-600">
                          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, displayDates.length)} of {displayDates.length} dates
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(Math.ceil(displayDates.length / limit), p + 1))}
                            disabled={page === Math.ceil(displayDates.length / limit)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border border-slate-200 rounded-md bg-slate-50">
                      <p className="text-sm text-slate-600">
                        No attendance records found for this class.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Current Mode: Show date input and navigation */
              <>
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateDate(-1)}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-auto"
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateDate(1)}
                      className="flex items-center gap-2"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToYesterday}>
                      Yesterday
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToLastMonth}>
                      1 Month Ago
                    </Button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <p className="text-sm text-muted-foreground">
                    Selected Date:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatDateForUI(selectedDate, calendarSystem)}
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Students Attendance Table */}
      <Card className="border shadow-sm border-slate-200">
        <CardHeader className="border-b bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-slate-600" />
            <div>
              <CardTitle className="text-slate-900">
                Students Attendance
              </CardTitle>
              <CardDescription className="text-slate-600">
                {students.length}{" "}
                {students.length === 1 ? "student" : "students"} in class
                {isHistory && " • Historical Record"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {studentsLoading || attendanceLoading ? (
            <LoadingState rows={5} columns={4} />
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">NO</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Present</span>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600" />
                        <span>Absent</span>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span>Late</span>
                      </div>
                    </TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-gray-500 text-sm"
                      >
                        No students found in this class
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedStudents.map((student, index) => {
                      const status = attendanceStates[student.id] || "present";
                      const notes = attendanceNotes[student.id] || "";
                      const showReason =
                        status === "late" || status === "absent";
                      // Get class name from student data
                      const getClassName = (student: any): string => {
                        if (
                          "classHistory" in student &&
                          Array.isArray(student.classHistory)
                        ) {
                          const activeClass = student.classHistory.find(
                            (ch: any) => !ch.endDate
                          );
                          if (activeClass?.class?.name) {
                            return activeClass.class.name;
                          }
                        }
                        return classData?.data?.name || "Not Assigned";
                      };
                      const className = getClassName(student);

                      return (
                        <TableRow key={student.id}>
                          <TableCell className="text-center font-medium">
                            {(page - 1) * limit + index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <h3 className="font-semibold">
                                {formatFullName(
                                  student.firstName,
                                  student.lastName
                                )}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {className}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="default"
                              className="bg-blue-100 text-blue-800 border border-blue-300 font-medium"
                            >
                              {className}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={status === "present"}
                                disabled={isHistory || !canMarkAttendance}
                                onCheckedChange={(checked) => {
                                  if (
                                    checked &&
                                    !isHistory &&
                                    canMarkAttendance
                                  ) {
                                    handleStatusChange(student.id, "present");
                                  }
                                }}
                                className={cn(
                                  "h-5 w-5 border-green-600",
                                  status === "present" &&
                                  "bg-green-600 border-green-600",
                                  (isHistory || !canMarkAttendance) &&
                                  "opacity-50 cursor-not-allowed"
                                )}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={status === "absent"}
                                disabled={isHistory || !canMarkAttendance}
                                onCheckedChange={(checked) => {
                                  if (
                                    checked &&
                                    !isHistory &&
                                    canMarkAttendance
                                  ) {
                                    handleStatusChange(student.id, "absent");
                                  }
                                }}
                                className={cn(
                                  "h-5 w-5 border-red-600",
                                  status === "absent" &&
                                  "bg-red-600 border-red-600",
                                  (isHistory || !canMarkAttendance) &&
                                  "opacity-50 cursor-not-allowed"
                                )}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={status === "late"}
                                disabled={isHistory || !canMarkAttendance}
                                onCheckedChange={(checked) => {
                                  if (
                                    checked &&
                                    !isHistory &&
                                    canMarkAttendance
                                  ) {
                                    handleStatusChange(student.id, "late");
                                  }
                                }}
                                className={cn(
                                  "h-5 w-5 border-yellow-600",
                                  status === "late" &&
                                  "bg-yellow-600 border-yellow-600",
                                  (isHistory || !canMarkAttendance) &&
                                  "opacity-50 cursor-not-allowed"
                                )}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            {showReason ? (
                              <Input
                                type="text"
                                placeholder={
                                  status === "late"
                                    ? "Reason for being late..."
                                    : "Reason for absence..."
                                }
                                value={notes}
                                onChange={(e) =>
                                  handleNotesChange(student.id, e.target.value)
                                }
                                disabled={isHistory && !canMarkAttendance}
                                className="w-full min-w-[200px] text-sm"
                                maxLength={200}
                              />
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {studentsData?.pagination && studentsData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-600">
                Showing {(page - 1) * limit + 1} to {" "}
                {Math.min(page * limit, studentsData.pagination.total)} of {" "}
                {studentsData.pagination.total} students
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage((p) =>
                      Math.min(studentsData.pagination!.totalPages, p + 1),
                    );
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={page === studentsData.pagination!.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button - Only show for current date and TEACHER role */}
      {!isHistory && canMarkAttendance && (
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSave}
            disabled={bulkAttendance.isPending}
            size="lg"
            className="bg-slate-700 hover:bg-slate-800"
          >
            <Save className="mr-2 h-5 w-5" />
            {bulkAttendance.isPending ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      )}
    </div>
  );
}
