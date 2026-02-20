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
  MessageSquare,
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

  // Pagination state for display only
  const [page, setPage] = useState(1);
  const [limit] = useState(40);

  const { data: classData, isLoading: classLoading } = useClass(classId);
  // Fetch ALL students for attendance recording (no pagination)
  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    classId,
    classStatus: "assigned",
    page: 1,
    limit: 1000, // Large limit to get all students
  });

  // Get available dates for history
  const {
    data: datesData,
    isLoading: datesLoading,
    refetch: refetchDates,
    error: datesError,
  } = useClassAttendanceDates(classId);
  const {
    data: summaryData,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useClassAttendanceSummary(classId);

  const availableDates = useMemo(() => {
    if (!datesData?.data) return [];
    const dates = Array.isArray(datesData.data) ? datesData.data : [];
    // Filter out any invalid dates and sort: latest first
    const validDates = dates.filter((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    });
    return validDates.sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );
  }, [datesData]);

  // Create a map of date -> summary stats for quick lookup
  const summaryMap = useMemo(() => {
    if (!summaryData?.data) return new Map();
    const map = new Map();
    summaryData.data.forEach((item) => {
      // Normalize date to YYYY-MM-DD format for consistent lookup
      const normalizedDate = item.date.split("T")[0];
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
      return summaryData.data
        .map((item) => {
          const date = item.date.split("T")[0];
          return date;
        })
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }
    return availableDates;
  }, [summaryData, availableDates]);

  // Get latest date from display dates for default
  const latestDate = displayDates.length > 0 ? displayDates[0] : todayStr;

  const [selectedDate, setSelectedDate] = useState<string>(
    searchParams.get("date") || (isHistoryMode ? latestDate : todayStr),
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
    if (isHistoryMode && displayDates.length > 0 && !searchParams.get("date")) {
      const latest = displayDates[0];
      if (latest && latest !== selectedDate) {
        setSelectedDate(latest);
        router.push(
          `/dashboard/attendance/${classId}?date=${latest}&history=true`,
          { scroll: false },
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

  // Sync selectedDate with URL params and update pagination page
  useEffect(() => {
    const urlDate = searchParams.get("date");
    if (urlDate && urlDate !== selectedDate) {
      setSelectedDate(urlDate);
    }

    // Auto-navigate to the page containing the selected date in history
    if (isHistoryMode && displayDates.length > 0 && selectedDate) {
      const dateIndex = displayDates.indexOf(selectedDate);
      if (dateIndex !== -1) {
        const targetPage = Math.floor(dateIndex / limit) + 1;
        if (targetPage !== page) {
          setPage(targetPage);
        }
      }
    }
  }, [searchParams, selectedDate, isHistoryMode, displayDates, limit, page]);

  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    refetch: refetchAttendance,
  } = useAttendanceByClass(classId, selectedDate);

  // Force refetch when selectedDate changes
  useEffect(() => {
    if (selectedDate && classId) {
      refetchAttendance();
    }
  }, [selectedDate, classId, refetchAttendance]);
  const bulkAttendance = useBulkAttendance();
  const updateAttendance = useUpdateAttendance();

  // Prepare students data for memoization - date-aware for history mode
  const students = useMemo(() => {
    // If in history mode, favor the student list from the attendance response
    // (which only includes students assigned on that specific date)
    if (isHistoryMode && attendanceData?.data?.students) {
      return attendanceData.data.students.map((item: any) => ({
        ...item.student,
        // Carry over any relevant data if needed
      }));
    }
    // Fallback to the general students pool for the current date
    return Array.isArray(studentsData?.data) ? studentsData.data : [];
  }, [studentsData?.data, isHistoryMode, attendanceData?.data]);

  // Calculate attendance statistics for the currently selected date
  const currentDateStats = useMemo(() => {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      total: students.length,
    };

    if (!attendanceData?.data) return stats;

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

    attendanceRecords.forEach((record: any) => {
      if (record.status === "present") stats.present++;
      else if (record.status === "absent") stats.absent++;
      else if (record.status === "late") stats.late++;
    });

    return stats;
  }, [attendanceData, students]);

  const [attendanceStates, setAttendanceStates] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [attendanceIds, setAttendanceIds] = useState<Record<string, string>>(
    {},
  );
  const [attendanceNotes, setAttendanceNotes] = useState<
    Record<string, string>
  >({});
  const [hasChanges, setHasChanges] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus>("all");

  // Update URL when date changes
  const handleDateChange = (newDate: string) => {
    if (newDate === selectedDate) return; // Prevent unnecessary updates
    setSelectedDate(newDate);
    setHasChanges(false);
    const historyParam = isHistoryMode ? "&history=true" : "";
    router.push(
      `/dashboard/attendance/${classId}?date=${newDate}${historyParam}`,
      { scroll: false },
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
            (a.student && a.student.id === student.id),
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

    // Refresh history summary to show the new record dynamically
    refetchDates();
    refetchSummary();

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
            a.id === attendanceId,
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

  // Sort and Filter students - alphabetical by first name, then by selected status filter
  const sortedStudents = useMemo(() => {
    let filtered = [...students];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(student => {
        const status = attendanceStates[student.id] || "present";
        return status === statusFilter;
      });
    }

    return filtered.sort((a, b) => {
      return (a.firstName || "").localeCompare(b.firstName || "");
    });
  }, [students, statusFilter, attendanceStates]);

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
                {classData.data.name} •{" "}
                {formatDateForUI(selectedDate, calendarSystem)}
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
                  `/dashboard/attendance/${classId}?date=${selectedDate}&history=true`,
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
            <CardTitle className="text-slate-900">Date Selection</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {isHistory ? (
              <div className="space-y-4">
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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Export logic remains same
                            const headers = ["Date", "Present", "Absent", "Late", "Total"];
                            const rows = summaryData.data.map((item) => [
                              format(new Date(item.date), "MMM dd, yyyy"),
                              item.present.toString(),
                              item.absent.toString(),
                              item.late.toString(),
                              item.total.toString(),
                            ]);
                            const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
                            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.setAttribute("download", `attendance-summary.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {datesLoading ? (
                  <div className="p-12 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600 mx-auto mb-4" />
                    <p className="text-sm font-medium text-slate-500">Synchronizing history...</p>
                  </div>
                ) : datesError ? (
                  <div className="p-6 border border-red-100 rounded-xl bg-red-50/50 text-center">
                    <p className="text-sm text-red-600 mb-3">Failed to retrieve attendance history.</p>
                    <Button variant="outline" size="sm" onClick={() => { refetchDates(); refetchSummary(); }}>Try Again</Button>
                  </div>
                ) : displayDates.length > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="hover:bg-transparent border-slate-200">
                            <TableHead className="w-12 h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-center">#</TableHead>
                            <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500">Recorded Date</TableHead>
                            <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-center">Summary</TableHead>
                            <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-right pr-6">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayDates
                            .slice((page - 1) * limit, page * limit)
                            .map((date, idx) => {
                              const isSelected = date === selectedDate;
                              const stats = summaryMap.get(date.split("T")[0]) || summaryMap.get(date) || { present: 0, absent: 0, late: 0, total: students.length };

                              return (
                                <TableRow key={date} className={cn("group transition-colors border-slate-100", isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/30")}>
                                  <TableCell className="text-center py-3 font-mono text-[10px] text-slate-400">
                                    {String((page - 1) * limit + idx + 1).padStart(2, '0')}
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <div className="flex items-center gap-3">
                                      <div className={cn("p-1.5 rounded-md", isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}>
                                        <Calendar className="h-3.5 w-3.5" />
                                      </div>
                                      <div>
                                        <p className={cn("text-xs font-bold", isSelected ? "text-blue-700" : "text-slate-900")}>
                                          {formatDateForUI(date, calendarSystem)}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium">{stats.total} Students</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <div className="flex items-center justify-center gap-4">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        <span className="text-[11px] font-bold text-slate-700">{stats.present}</span>
                                        <span className="text-[9px] text-slate-400 uppercase font-medium">Pres</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        <span className="text-[11px] font-bold text-slate-700">{stats.absent}</span>
                                        <span className="text-[9px] text-slate-400 uppercase font-medium">Abs</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                        <span className="text-[11px] font-bold text-slate-700">{stats.late}</span>
                                        <span className="text-[9px] text-slate-400 uppercase font-medium">Lat</span>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 text-right pr-6">
                                    <Button
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handleDateChange(date)}
                                      className={cn("h-7 text-[10px] font-bold px-3 transition-all", isSelected ? "bg-blue-600 hover:bg-blue-700" : "text-slate-600")}
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

                    <div className="flex items-center justify-between px-2 pt-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Page <span className="text-slate-900">{page}</span> / {Math.ceil(displayDates.length / limit)}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 px-3 text-xs font-bold text-slate-600"><ChevronLeft className="h-3.5 w-3.5 mr-1" />Prev</Button>
                        <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(Math.ceil(displayDates.length / limit), p + 1))} disabled={page === Math.ceil(displayDates.length / limit)} className="h-8 px-3 text-xs font-bold text-slate-600">Next<ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center">
                    <HistoryIcon className="h-6 w-6 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-900">No History Found</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => navigateDate(-1)}><ChevronLeft className="h-4 w-4 mr-2" />Previous</Button>
                    <Input type="date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)} className="w-auto" />
                    <Button variant="outline" size="sm" onClick={() => navigateDate(1)}>Next<ChevronRight className="h-4 w-4 ml-2" /></Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
                    <Button variant="outline" size="sm" onClick={goToYesterday}>Yesterday</Button>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-sm text-muted-foreground">Selected Date: <span className="font-semibold text-slate-900">{formatDateForUI(selectedDate, calendarSystem)}</span></p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card >

      {/* Students Attendance Table */}
      < Card className="border shadow-sm border-slate-200" >
        <CardHeader className="border-b bg-slate-50 border-slate-200">
          <div className="flex items-center justify-between">
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Export student list to CSV (alphabetically sorted)
                  const headers = [
                    "No",
                    "Student Name",
                    "Class",
                    "Present",
                    "Absent",
                    "Late",
                    "Reason",
                  ];
                  const rows = sortedStudents.map((student, index) => {
                    const status = attendanceStates[student.id] || "present";
                    const notes = attendanceNotes[student.id] || "";
                    const getClassName = (student: any): string => {
                      if (
                        "classHistory" in student &&
                        Array.isArray(student.classHistory)
                      ) {
                        const activeClass = student.classHistory.find(
                          (ch: any) => !ch.endDate,
                        );
                        if (activeClass?.class?.name)
                          return activeClass.class.name;
                      }
                      return classData?.data?.name || "Not Assigned";
                    };
                    return [
                      (index + 1).toString(),
                      formatFullName(
                        student.firstName,
                        student.lastName,
                      ).replace(/,/g, " "),
                      getClassName(student).replace(/,/g, " "),
                      status === "present" ? "Yes" : "No",
                      status === "absent" ? "Yes" : "No",
                      status === "late" ? "Yes" : "No",
                      notes.replace(/,/g, " ") || "-",
                    ];
                  });
                  const csvContent = [
                    headers.join(","),
                    ...rows.map((row) => row.join(",")),
                  ].join("\n");
                  const blob = new Blob([csvContent], {
                    type: "text/csv;charset=utf-8;",
                  });
                  const link = document.createElement("a");
                  const url = URL.createObjectURL(blob);
                  link.setAttribute("href", url);
                  link.setAttribute(
                    "download",
                    `attendance-students-${classData?.data?.name || "class"}-${selectedDate}.csv`,
                  );
                  link.style.visibility = "hidden";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="text-xs"
                disabled={sortedStudents.length === 0}
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Print student list (alphabetically sorted)
                  const printWindow = window.open("", "_blank");
                  if (!printWindow) return;
                  const studentRows = sortedStudents
                    .map((student, index) => {
                      const status = attendanceStates[student.id] || "present";
                      const notes = attendanceNotes[student.id] || "";
                      const getClassName = (student: any): string => {
                        if (
                          "classHistory" in student &&
                          Array.isArray(student.classHistory)
                        ) {
                          const activeClass = student.classHistory.find(
                            (ch: any) => !ch.endDate,
                          );
                          if (activeClass?.class?.name)
                            return activeClass.class.name;
                        }
                        return classData?.data?.name || "Not Assigned";
                      };
                      const statusColor =
                        status === "present"
                          ? "#16a34a"
                          : status === "absent"
                            ? "#dc2626"
                            : "#ca8a04";
                      const statusText =
                        status === "present"
                          ? "Present"
                          : status === "absent"
                            ? "Absent"
                            : "Late";
                      return `
                      <tr>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">${formatFullName(student.firstName, student.lastName)}</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">${getClassName(student)}</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: ${statusColor}; font-weight: 600;">${statusText}</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">${notes || "-"}</td>
                      </tr>
                    `;
                    })
                    .join("");
                  const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Attendance - ${classData?.data?.name || "Class"} - ${formatDateForUI(selectedDate, calendarSystem)}</title>
                        <style>
                          body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
                          h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }
                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                          th { background-color: #f3f4f6; padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
                          td { padding: 10px; border: 1px solid #ddd; }
                          .summary { margin-top: 20px; padding: 15px; background-color: #f9fafb; border: 1px solid #ddd; }
                          @media print { body { margin: 0; } }
                        </style>
                      </head>
                      <body>
                        <h1>Student Attendance - ${classData?.data?.name || "Class"}</h1>
                        <p><strong>Date:</strong> ${formatDateForUI(selectedDate, calendarSystem)}</p>
                        <p><strong>Total Students:</strong> ${sortedStudents.length}</p>
                        <div class="summary">
                          <strong>Present:</strong> ${currentDateStats.present} | 
                          <strong>Absent:</strong> ${currentDateStats.absent} | 
                          <strong>Late:</strong> ${currentDateStats.late}
                        </div>
                        <table>
                          <thead>
                            <tr>
                              <th style="width: 50px; text-align: center;">No</th>
                              <th>Student Name</th>
                              <th>Class</th>
                              <th style="text-align: center;">Status</th>
                              <th>Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${studentRows}
                          </tbody>
                        </table>
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
                disabled={sortedStudents.length === 0}
              >
                <Printer className="h-3 w-3 mr-1" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {studentsLoading || attendanceLoading ? (
            <LoadingState rows={5} columns={4} />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-xl border border-slate-200/60 w-fit">
                  <Button
                    variant={statusFilter === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                    className={cn(
                      "h-8 text-[11px] font-bold px-3 transition-all",
                      statusFilter === "all" ? "bg-slate-700 shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-900"
                    )}
                  >
                    All ({students.length})
                  </Button>
                  <Button
                    variant={statusFilter === "present" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setStatusFilter("present")}
                    className={cn(
                      "h-8 text-[11px] font-bold px-3 transition-all",
                      statusFilter === "present" ? "bg-green-600 shadow-sm" : "text-slate-500 hover:bg-white hover:text-green-600"
                    )}
                  >
                    Present ({currentDateStats.present})
                  </Button>
                  <Button
                    variant={statusFilter === "absent" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setStatusFilter("absent")}
                    className={cn(
                      "h-8 text-[11px] font-bold px-3 transition-all",
                      statusFilter === "absent" ? "bg-red-600 shadow-sm" : "text-slate-500 hover:bg-white hover:text-red-600"
                    )}
                  >
                    Absent ({currentDateStats.absent})
                  </Button>
                  <Button
                    variant={statusFilter === "late" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setStatusFilter("late")}
                    className={cn(
                      "h-8 text-[11px] font-bold px-3 transition-all",
                      statusFilter === "late" ? "bg-yellow-600 shadow-sm" : "text-slate-500 hover:bg-white hover:text-yellow-600"
                    )}
                  >
                    Late ({currentDateStats.late})
                  </Button>
                </div>

                {statusFilter !== "all" && (
                  <p className="text-[10px] text-slate-400 font-medium italic">
                    Showing {sortedStudents.length} {statusFilter} students
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-slate-200">
                      <TableHead className="w-16 h-12 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-center">NO</TableHead>
                      <TableHead className="h-12 text-[10px] uppercase font-bold tracking-wider text-slate-500">Student Name</TableHead>
                      <TableHead className="h-12 text-[10px] uppercase font-bold tracking-wider text-slate-500">Class Info</TableHead>
                      <TableHead className="h-12 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-center">Status Control</TableHead>
                      <TableHead className="h-12 text-[10px] uppercase font-bold tracking-wider text-slate-500">Reason / Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStudents.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-24 text-slate-400"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-10 w-10 opacity-20" />
                            <p className="font-medium text-slate-500">No students assigned on this date</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedStudents.map((student, actualIndex) => {
                        const status = attendanceStates[student.id] || "present";
                        const notes = attendanceNotes[student.id] || "";
                        const showReason =
                          status === "late" || status === "absent";

                        const getClassName = (student: any): string => {
                          if (
                            "classHistory" in student &&
                            Array.isArray(student.classHistory)
                          ) {
                            const activeClass = student.classHistory.find(
                              (ch: any) => !ch.endDate,
                            );
                            if (activeClass?.class?.name) return activeClass.class.name;
                          }
                          return classData?.data?.name || "Not Assigned";
                        };
                        const className = getClassName(student);

                        return (
                          <TableRow
                            key={student.id}
                            className="group hover:bg-slate-50/50 transition-colors border-slate-100"
                          >
                            <TableCell className="text-center py-4 font-mono text-xs text-slate-400">
                              {String(actualIndex + 1).padStart(2, '0')}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {formatFullName(student.firstName, student.lastName)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">#{student.id.slice(0, 8)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge
                                variant="outline"
                                className="bg-slate-50 text-slate-600 border-slate-200 font-bold text-[10px] px-2"
                              >
                                {className}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center justify-center gap-2">
                                {["present", "absent", "late"].map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => !isHistory && canMarkAttendance && handleStatusChange(student.id, s as AttendanceStatus)}
                                    disabled={isHistory && !canMarkAttendance}
                                    className={cn(
                                      "flex items-center justify-center w-8 h-8 rounded-lg transition-all border",
                                      status === s
                                        ? s === "present" ? "bg-green-600 border-green-600 text-white shadow-sm"
                                          : s === "absent" ? "bg-red-600 border-red-600 text-white shadow-sm"
                                            : "bg-yellow-600 border-yellow-600 text-white shadow-sm"
                                        : "bg-white border-slate-200 text-slate-400 hover:border-slate-300",
                                      (isHistory && !canMarkAttendance) && "opacity-50 cursor-not-allowed"
                                    )}
                                    title={s.charAt(0).toUpperCase() + s.slice(1)}
                                  >
                                    {s === "present" ? <Check className="h-4 w-4" />
                                      : s === "absent" ? <X className="h-4 w-4" />
                                        : <Clock className="h-4 w-4" />}
                                  </button>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="py-4 pr-6">
                              {showReason ? (
                                <div className="relative">
                                  <Input
                                    type="text"
                                    placeholder="Type reason here..."
                                    value={notes}
                                    onChange={(e) => handleNotesChange(student.id, e.target.value)}
                                    disabled={isHistory && !canMarkAttendance}
                                    className="h-9 bg-slate-50/50 border-slate-200 text-xs focus:bg-white transition-all pl-8"
                                    maxLength={200}
                                  />
                                  <MessageSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                </div>
                              ) : (
                                <div className="h-9 flex items-center bg-slate-50/30 border border-dashed border-slate-200 rounded-md px-3">
                                  <span className="text-[10px] text-slate-400 italic">No notes required for Present</span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          {/* Student Pagination Removed */}
        </CardContent>
      </Card>

      {/* Save Button - Only show for current date and TEACHER role */}
      {
        !isHistory && canMarkAttendance && (
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
        )
      }
    </div >
  );
}
