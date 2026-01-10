"use client";

import { use, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClass } from "@/lib/hooks/use-classes";
import { useStudents } from "@/lib/hooks/use-students";
import {
  useAttendanceByClass,
  useBulkAttendance,
  useClassAttendanceDates,
  useUpdateAttendance,
} from "@/lib/hooks/use-attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { AttendanceStatus, Attendance } from "@/lib/types";
import { formatFullName, formatDate } from "@/lib/utils/format";
import {
  Check,
  X,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  Save,
  History as HistoryIcon,
  Edit,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import { BackButton } from "@/components/shared/BackButton";

export default function AttendanceBulkPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasRole } = useAuthStore();

  // Get date from URL or default to today
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const isHistoryMode = searchParams.get("history") === "true";

  const { data: classData, isLoading: classLoading } = useClass(classId);
  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    classId,
    classStatus: "assigned",
  });

  // Get available dates for history
  const { data: datesData } = useClassAttendanceDates(classId);
  const availableDates = useMemo(() => {
    const dates = datesData?.data || [];
    // Sort dates: latest first
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [datesData]);

  // Get latest date from available dates for default
  const latestDate = availableDates.length > 0 ? availableDates[0] : todayStr;

  const [selectedDate, setSelectedDate] = useState<string>(
    searchParams.get("date") || (isHistoryMode ? latestDate : todayStr)
  );

  // Update selected date to latest when in history mode and dates are loaded
  useEffect(() => {
    if (
      isHistoryMode &&
      availableDates.length > 0 &&
      !searchParams.get("date")
    ) {
      const latest = availableDates[0];
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
    availableDates,
    classId,
    router,
    searchParams,
    selectedDate,
  ]);

  const { data: attendanceData, isLoading: attendanceLoading } =
    useAttendanceByClass(classId, selectedDate);
  const bulkAttendance = useBulkAttendance();
  const updateAttendance = useUpdateAttendance();

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
    setSelectedDate(newDate);
    const historyParam = isHistoryMode ? "&history=true" : "";
    router.push(
      `/dashboard/attendance/${classId}?date=${newDate}${historyParam}`,
      { scroll: false }
    );
    setHasChanges(false);
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

  // Prepare students data for memoization (hooks must be called before early returns)
  const students = useMemo(() => {
    return Array.isArray(studentsData?.data) ? studentsData.data : [];
  }, [studentsData?.data]);

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
            <div
              className={cn(
                "p-3 rounded-lg border",
                isHistory
                  ? "bg-amber-50 border-amber-200"
                  : "bg-slate-100 border-slate-200"
              )}
            >
              {isHistory ? (
                <HistoryIcon className="h-8 w-8 text-amber-700" />
              ) : (
                <Calendar className="h-8 w-8 text-slate-700" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                {isHistory ? "Attendance History" : "Mark Attendance"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {classData.data.name} • {formatDate(selectedDate)}
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
              className="bg-amber-100 text-amber-800 border-amber-300"
            >
              <HistoryIcon className="h-3 w-3 mr-1" />
              Viewing History
            </Badge>
          )}
        </div>
      </div>

      {/* Date Navigation Card */}
      <Card
        className={cn(
          "border shadow-sm",
          isHistory ? "border-amber-200 bg-amber-50/30" : "border-slate-200"
        )}
      >
        <CardHeader
          className={cn(
            "border-b",
            isHistory
              ? "bg-amber-50 border-amber-200"
              : "bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <Calendar
              className={cn(
                "h-5 w-5",
                isHistory ? "text-amber-700" : "text-slate-600"
              )}
            />
            <CardTitle
              className={isHistory ? "text-amber-900" : "text-slate-900"}
            >
              Date Selection
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {isHistory ? (
              /* History Mode: Only show dropdown */
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-700 font-semibold mb-2 block">
                    Select Date from History
                  </Label>
                  {availableDates.length > 0 ? (
                    <>
                      <Select
                        value={selectedDate}
                        onValueChange={handleDateChange}
                      >
                        <SelectTrigger className="w-full md:w-[300px] border-slate-200">
                          <SelectValue placeholder="Select a date from history" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDates.map((date) => (
                            <SelectItem key={date} value={date}>
                              {formatDate(date)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-2">
                        {availableDates.length}{" "}
                        {availableDates.length === 1 ? "date" : "dates"} with
                        attendance records
                      </p>
                    </>
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
                      {formatDate(selectedDate)}
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Students Attendance Table */}
      <Card
        className={cn(
          "border shadow-sm",
          isHistory ? "border-amber-200 bg-amber-50/30" : "border-slate-200"
        )}
      >
        <CardHeader
          className={cn(
            "border-b",
            isHistory
              ? "bg-amber-50 border-amber-200"
              : "bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <Users
              className={cn(
                "h-5 w-5",
                isHistory ? "text-amber-700" : "text-slate-600"
              )}
            />
            <div>
              <CardTitle
                className={isHistory ? "text-amber-900" : "text-slate-900"}
              >
                Students Attendance
              </CardTitle>
              <CardDescription
                className={isHistory ? "text-amber-700" : "text-slate-600"}
              >
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
                            {index + 1}
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
