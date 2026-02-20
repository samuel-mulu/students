"use client";

import { ExportAttendanceDialog } from "@/components/forms/ExportAttendanceDialog";

import { DateField } from "@/components/shared/DateField";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useActiveAcademicYear } from "@/lib/hooks/use-academicYears";
import {
  useAttendanceByClass,
  useBulkAttendance,
} from "@/lib/hooks/use-attendance";
import { useClasses } from "@/lib/hooks/use-classes";
import { useStudents } from "@/lib/hooks/use-students";
import { useAuthStore } from "@/lib/store/auth-store";
import { AttendanceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateForUI } from "@/lib/utils/date";
import { formatFullName } from "@/lib/utils/format";
import { isNoClassDay } from "@/lib/utils/schoolCalendar";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  History,
  Save,
  Users,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function AttendancePage() {
  const router = useRouter();
  const { hasRole, user } = useAuthStore();
  const { data: activeYearData } = useActiveAcademicYear();
  const { calendarSystem } = useCalendarSystem();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceStates, setAttendanceStates] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [attendanceNotes, setAttendanceNotes] = useState<Record<string, string>>({});
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const { data: classesData } = useClasses();
  const { data: studentsData, isLoading: studentsLoading, error: studentsError } = useStudents({
    classId: selectedClassId || undefined,
    classStatus: "assigned",
    page: 1,
    limit: 1000,
  });
  const { data: attendanceData, isLoading: attendanceLoading, error: attendanceError } =
    useAttendanceByClass(selectedClassId || "", selectedDate);
  const bulkAttendance = useBulkAttendance();

  // Role-based access control
  const canMarkAttendance = hasRole(["TEACHER"]);
  const canViewAttendance = hasRole(["TEACHER", "OWNER"]);
  const isTeacher = hasRole(["TEACHER"]);
  const activeYear = activeYearData?.data;

  // Reset page when class changes
  // No-op - pagination removed

  // If user doesn't have permission to view, show error
  if (!canViewAttendance) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                You don't have permission to view attendance. Only teachers and owners can access this page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allClasses = Array.isArray(classesData?.data) ? classesData.data : [];

  // Filter classes for teachers: 
  // Step 1: Filter by active academic year first
  // Step 2: Then filter by assigned classes
  const classes = useMemo(() => {
    // For owners, show all classes
    if (!isTeacher) {
      return allClasses;
    }

    // For teachers: must have active academic year
    if (!activeYear || !activeYear.id) {
      return [];
    }

    // Step 1: Get classes from active academic year
    const activeYearClasses = allClasses.filter((cls) => {
      // Check both academicYearId and legacy academicYear field
      if (cls.academicYearId) {
        return cls.academicYearId === activeYear.id;
      }
      // Legacy support: check if academicYear is a string matching the active year name
      if (typeof cls.academicYear === 'string') {
        return cls.academicYear === activeYear.name;
      }
      // If academicYear is an object, check its id
      if (typeof cls.academicYear === 'object' && cls.academicYear?.id) {
        return cls.academicYear.id === activeYear.id;
      }
      return false;
    });

    // Step 2: Filter by assigned classes (if teacher has assigned classes)
    if (user?.teacherClasses && user.teacherClasses.length > 0) {
      const assignedClassIds = user.teacherClasses.map((tc) => tc.id);
      return activeYearClasses.filter((cls) => assignedClassIds.includes(cls.id));
    }

    // If no assigned classes, return empty array
    return [];
  }, [isTeacher, user?.teacherClasses, activeYear, allClasses]);

  // Check if attendance is recorded for the selected date
  const isAttendanceRecorded = useMemo(() => {
    if (!attendanceData?.data || !selectedClassId) return false;

    let attendanceArray: unknown[] = [];
    if (Array.isArray(attendanceData.data)) {
      attendanceArray = attendanceData.data;
    } else if (attendanceData.data.students) {
      attendanceArray = attendanceData.data.students.map((item: { attendance: unknown; student?: { id: string } }) => {
        const attendance = item.attendance as { id?: string; studentId?: string };
        return {
          ...attendance,
          studentId: item.student?.id || attendance.studentId,
        };
      }).filter((item: { id?: string }) => item && item.id);
    }

    return attendanceArray.length > 0;
  }, [attendanceData, selectedClassId]);

  // Determine if we're in read-only mode (past date with recorded attendance)
  const isReadOnly = useMemo(() => {
    if (!isAttendanceRecorded) return false;
    const selected = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  }, [isAttendanceRecorded, selectedDate]);

  // Date navigation functions
  const handlePreviousDate = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(currentDate.toISOString().split("T")[0]);
    setIsDirty(false); // Reset dirty flag when date changes
  };

  const handleNextDate = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (currentDate <= today) {
      setSelectedDate(currentDate.toISOString().split("T")[0]);
      setIsDirty(false); // Reset dirty flag when date changes
    }
  };

  // Check if navigation buttons should be disabled
  const canGoPrevious = useMemo(() => {
    // Allow going back as far as needed (or set a limit if desired)
    return true;
  }, []);

  const canGoNext = useMemo(() => {
    const currentDate = new Date(selectedDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    currentDate.setHours(23, 59, 59, 999);
    return currentDate < today;
  }, [selectedDate]);

  // Initialize attendance states from API data
  useEffect(() => {
    // ONLY initialize if not dirty OR if we don't have local states yet
    const hasLocalStates = Object.keys(attendanceStates).length > 0;

    if (attendanceData?.data && studentsData?.data && (!isDirty || !hasLocalStates)) {
      const states: Record<string, AttendanceStatus> = {};
      const notes: Record<string, string> = {};

      // Handle different response structures
      let attendanceArray: unknown[] = [];
      if (Array.isArray(attendanceData.data)) {
        attendanceArray = attendanceData.data;
      } else if (attendanceData.data.students) {
        attendanceArray = attendanceData.data.students.map((item: { attendance: unknown; student?: { id: string } }) => {
          const attendance = item.attendance as { id?: string; studentId?: string };
          return {
            ...attendance,
            studentId: item.student?.id || attendance.studentId,
          };
        }).filter((item: { id?: string }) => item && item.id);
      }

      studentsData.data.forEach((student) => {
        const existing = attendanceArray.find(
          (a: unknown) => {
            const acc = a as { studentId: string; student?: { id: string } };
            return acc.studentId === student.id ||
              (acc.student && acc.student.id === student.id);
          }
        ) as { status?: AttendanceStatus; notes?: string } | undefined;
        states[student.id] = existing?.status || "present";
        notes[student.id] = existing?.notes || "";
      });
      setAttendanceStates(states);
      setAttendanceNotes(notes);
      setIsDirty(false); // Data is now in sync with server
    } else if (studentsData?.data && !isReadOnly && (!isDirty || !hasLocalStates)) {
      // Only set default "present" if not in read-only mode (to avoid overwriting recorded data)
      const states: Record<string, AttendanceStatus> = {};
      const notes: Record<string, string> = {};
      studentsData.data.forEach((student) => {
        states[student.id] = "present";
        notes[student.id] = "";
      });
      setAttendanceStates(states);
      setAttendanceNotes(notes);
      setIsDirty(false);
    }
  }, [attendanceData, studentsData, isReadOnly, isDirty, selectedClassId, selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setIsDirty(true);
    setAttendanceStates((prev) => ({ ...prev, [studentId]: status }));
    // Clear notes if status changes to present
    if (status === 'present') {
      setAttendanceNotes((prev) => ({ ...prev, [studentId]: '' }));
    }
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setIsDirty(true);
    setAttendanceNotes((prev) => ({ ...prev, [studentId]: notes }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (studentsData?.data) {
      setIsDirty(true);
      const states: Record<string, AttendanceStatus> = {};
      const notes: Record<string, string> = {};
      studentsData.data.forEach((student) => {
        states[student.id] = status;
        notes[student.id] = '';
      });
      setAttendanceStates(states);
      setAttendanceNotes(notes);
    }
  };

  const handleSave = async () => {
    if (!studentsData?.data || !selectedClassId) return;

    // We allow updates now, so we don't block if attendance is already recorded.
    // However, if it is recorded and isReadOnly (past date), it's blocked.
    if (isReadOnly) {
      toast.error("Cannot Update Past Attendance", {
        description: "Viewing recorded attendance for a past date is read-only.",
      });
      return;
    }

    const attendanceDataToSave = studentsData.data.map((student) => {
      const status = attendanceStates[student.id] || "present";
      return {
        studentId: student.id,
        status,
        notes: (status === 'late' || status === 'absent') ? (attendanceNotes[student.id] || '') : '',
      };
    });

    try {
      await bulkAttendance.mutateAsync({
        classId: selectedClassId,
        date: selectedDate,
        attendanceData: attendanceDataToSave,
      });

      // Show success confirmation
      const presentCount = attendanceDataToSave.filter(a => a.status === 'present').length;
      const absentCount = attendanceDataToSave.filter(a => a.status === 'absent').length;
      const lateCount = attendanceDataToSave.filter(a => a.status === 'late').length;

      toast.success(isAttendanceRecorded ? "Attendance Updated" : "Attendance Saved Successfully", {
        description: `Attendance for ${formatDateForUI(selectedDate, calendarSystem)} has been recorded. Present: ${presentCount}, Absent: ${absentCount}, Late: ${lateCount}`,
        duration: 5000,
      });

      setIsDirty(false); // Reset dirty flag after successful save

      // After saving, move to the next date if it was a NEW record (not an update)
      if (!isAttendanceRecorded) {
        const currentDate = new Date(selectedDate);
        currentDate.setDate(currentDate.getDate() + 1);
        const nextDateStr = currentDate.toISOString().split("T")[0];
        setSelectedDate(nextDateStr);
      }
    } catch (error) {
      // Error handling is done by the mutation hook
      console.error("Failed to save attendance:", error);
    }
  };

  const handleExportClick = () => {
    if (!selectedClassId) {
      toast.error("Please select a class first");
      return;
    }
    if (!isAttendanceRecorded) {
      toast.warning("Attendance Not Recorded", {
        description: `Please record attendance for ${formatDateForUI(selectedDate, calendarSystem)} before exporting.`,
      });
      return;
    }
    setExportDialogOpen(true);
  };

  const students = Array.isArray(studentsData?.data) ? studentsData.data : [];

  // Sort students alphabetically by first name (A, B, C...)
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      return (a.firstName || '').localeCompare(b.firstName || '');
    });
  }, [students]);

  const showAttendanceTable = !!selectedClassId;
  const hasStudents = sortedStudents.length > 0;

  return (
    <div className="space-y-4 relative">
      {/* Loading Overlay for Bulk Actions */}
      {bulkAttendance.isPending && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4 border border-blue-100">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <div className="text-center">
              <p className="font-bold text-slate-800 text-lg">Recording Attendance...</p>
              <p className="text-sm text-slate-500">Please wait while we sync with the server.</p>
            </div>
          </div>
        </div>
      )}

      {/* Combined Card: Select Class/Date and Students Attendance */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900">Mark Attendance</CardTitle>
            <div className="flex items-center gap-2">
              {showAttendanceTable && selectedClassId && (
                <>
                  <Button
                    onClick={handleExportClick}
                    variant="outline"
                    size="sm"
                    className="border-blue-200 hover:bg-blue-50 text-blue-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button
                    onClick={() => {
                      router.push(`/dashboard/attendance/${selectedClassId}?date=${selectedDate}&history=true`);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <History className="mr-2 h-4 w-4" />
                    View History
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Class and Date Selection */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="class" className="text-slate-700 font-semibold">
                  Class *
                </Label>
                <Select
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {isTeacher && activeYear
                          ? `No assigned classes found in active academic year (${activeYear.name})`
                          : isTeacher && !activeYear
                            ? "No active academic year found. Please contact administrator."
                            : "No classes available"}
                      </div>
                    ) : (
                      classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">
                  Date *
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousDate}
                    disabled={!canGoPrevious || attendanceLoading}
                    className="border-slate-200"
                    title="Previous day"
                  >
                    {attendanceLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="flex-1 relative">
                    <DateField
                      valueISO={selectedDate}
                      onChangeISO={setSelectedDate}
                      disabled={attendanceLoading}
                      className="flex-1"
                    />
                    {isAttendanceRecorded && (
                      <Badge
                        className="absolute -top-2 -right-2 bg-green-500 text-white border-green-600"
                        variant="default"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Recorded
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleNextDate}
                    disabled={!canGoNext || attendanceLoading}
                    className="border-slate-200"
                    title="Next day"
                  >
                    {attendanceLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {/* Display formatted date and holiday/weekend info */}
                {selectedDate && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      {formatDateForUI(selectedDate, calendarSystem)}
                    </p>
                    {(() => {
                      const noClassInfo = isNoClassDay(selectedDate);
                      if (noClassInfo.isNoClass) {
                        return (
                          <Badge
                            variant={noClassInfo.reason === "holiday" ? "default" : "outline"}
                            className={cn(
                              noClassInfo.reason === "holiday" && "bg-orange-100 text-orange-800 border-orange-300",
                              noClassInfo.reason === "weekend" && "bg-gray-100 text-gray-800 border-gray-300",
                              noClassInfo.reason === "weekend-holiday" && "bg-purple-100 text-purple-800 border-purple-300"
                            )}
                          >
                            {noClassInfo.reason === "holiday" && "🎉"}
                            {noClassInfo.reason === "weekend" && "📅"}
                            {noClassInfo.reason === "weekend-holiday" && "📅🎉"}
                            {noClassInfo.holidayName && (
                              <span className="ml-1">{noClassInfo.holidayName}</span>
                            )}
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
                {attendanceLoading && (
                  <p className="text-xs text-muted-foreground">
                    Loading attendance data...
                  </p>
                )}
                {!attendanceLoading && isReadOnly && (
                  <p className="text-xs text-muted-foreground">
                    Viewing recorded attendance (read-only)
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions - Only show when class is selected, has students, user can mark attendance, and not in read-only mode */}
            {showAttendanceTable && hasStudents && canMarkAttendance && !isReadOnly && (
              <div className="flex gap-2 flex-wrap pt-2 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => handleMarkAll("present")}
                  className="border-green-200 hover:bg-green-50"
                  size="sm"
                >
                  <Check className="mr-2 h-4 w-4 text-green-600" />
                  Mark All Present
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleMarkAll("absent")}
                  className="border-red-200 hover:bg-red-50"
                  size="sm"
                >
                  <X className="mr-2 h-4 w-4 text-red-600" />
                  Mark All Absent
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleMarkAll("late")}
                  className="border-yellow-200 hover:bg-yellow-50"
                  size="sm"
                >
                  <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                  Mark All Late
                </Button>
              </div>
            )}

            {/* Students Attendance Table - Always show when class is selected */}
            {showAttendanceTable && (
              <div className="pt-4 border-t border-slate-200">
                {studentsLoading || attendanceLoading ? (
                  <LoadingState rows={5} columns={5} />
                ) : studentsError || attendanceError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                    <ErrorState
                      message={studentsError ? "Failed to load students" : "Failed to load attendance data"}
                      onRetry={() => window.location.reload()}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">
                            NO
                          </TableHead>
                          <TableHead>
                            Student Name
                          </TableHead>
                          <TableHead>
                            Class
                          </TableHead>
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
                          <TableHead>
                            Reason
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!hasStudents ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-12 text-gray-500 text-sm"
                            >
                              <div className="flex flex-col items-center gap-2">
                                <Users className="h-8 w-8 text-gray-400" />
                                <p className="font-medium">No students found in this class</p>
                                <p className="text-xs text-gray-400">
                                  This class may not have any assigned students yet.
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedStudents.map((student, index) => {
                            const status =
                              attendanceStates[student.id] || "present";
                            const notes = attendanceNotes[student.id] || '';
                            const showReason = status === 'late' || status === 'absent';

                            // Get class name from student data
                            const getClassName = (student: any): string => {
                              if ('classHistory' in student && Array.isArray(student.classHistory)) {
                                const activeClass = student.classHistory.find((ch: any) => !ch.endDate);
                                if (activeClass?.class?.name) {
                                  return activeClass.class.name;
                                }
                              }
                              const selectedClass = classes.find((c: any) => c.id === selectedClassId);
                              return selectedClass?.name || 'Not Assigned';
                            };
                            const className = getClassName(student);

                            return (
                              <TableRow
                                key={student.id}
                              >
                                <TableCell className="text-center font-medium">
                                  {index + 1}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <h3 className="font-semibold">{formatFullName(
                                      student.firstName,
                                      student.lastName
                                    )}</h3>
                                    <p className="text-xs text-gray-500">{className}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="default" className="bg-blue-100 text-blue-800 border border-blue-300 font-medium">
                                    {className}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center">
                                    <Checkbox
                                      checked={status === "present"}
                                      disabled={!canMarkAttendance || isReadOnly}
                                      onCheckedChange={(checked) => {
                                        if (canMarkAttendance && !isReadOnly) {
                                          if (checked) {
                                            handleStatusChange(student.id, "present");
                                          } else if (status === "present") {
                                            // Ensure at least one is checked, default back to present if "unchecking" present
                                            handleStatusChange(student.id, "present");
                                          }
                                        }
                                      }}
                                      className={cn(
                                        "h-5 w-5 border-green-600",
                                        status === "present" &&
                                        "bg-green-600 border-green-600",
                                        (!canMarkAttendance || isReadOnly) && "opacity-50 cursor-not-allowed"
                                      )}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center">
                                    <Checkbox
                                      checked={status === "absent"}
                                      disabled={!canMarkAttendance || isReadOnly}
                                      onCheckedChange={(checked) => {
                                        if (canMarkAttendance && !isReadOnly) {
                                          if (checked) {
                                            handleStatusChange(student.id, "absent");
                                          } else if (status === "absent") {
                                            // Handle unchecking by resetting to present
                                            handleStatusChange(student.id, "present");
                                          }
                                        }
                                      }}
                                      className={cn(
                                        "h-5 w-5 border-red-600",
                                        status === "absent" &&
                                        "bg-red-600 border-red-600",
                                        (!canMarkAttendance || isReadOnly) && "opacity-50 cursor-not-allowed"
                                      )}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center">
                                    <Checkbox
                                      checked={status === "late"}
                                      disabled={!canMarkAttendance || isReadOnly}
                                      onCheckedChange={(checked) => {
                                        if (canMarkAttendance && !isReadOnly) {
                                          if (checked) {
                                            handleStatusChange(student.id, "late");
                                          } else if (status === "late") {
                                            // Handle unchecking by resetting to present
                                            handleStatusChange(student.id, "present");
                                          }
                                        }
                                      }}
                                      className={cn(
                                        "h-5 w-5 border-yellow-600",
                                        status === "late" &&
                                        "bg-yellow-600 border-yellow-600",
                                        (!canMarkAttendance || isReadOnly) && "opacity-50 cursor-not-allowed"
                                      )}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {showReason ? (
                                    <Input
                                      type="text"
                                      placeholder={status === 'late' ? "Reason for being late..." : "Reason for absence..."}
                                      value={notes}
                                      onChange={(e) => handleNotesChange(student.id, e.target.value)}
                                      disabled={!canMarkAttendance || isReadOnly}
                                      className={cn(
                                        "w-full min-w-[200px] text-sm",
                                        isReadOnly && "cursor-not-allowed"
                                      )}
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

                {/* Student Pagination Removed */}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button at Bottom - Only for TEACHER, when there are students, and not in read-only mode */}
      {showAttendanceTable && hasStudents && canMarkAttendance && !isReadOnly && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={bulkAttendance.isPending}
            className="bg-blue-400 hover:bg-blue-500 text-white"
            size="lg"
          >
            <Save className="mr-2 h-5 w-5" />
            {bulkAttendance.isPending ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      )}
      <ExportAttendanceDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        classId={selectedClassId}
        className={classes.find((c: any) => c.id === selectedClassId)?.name || ''}
        date={selectedDate}
      />
    </div>
  );
}
