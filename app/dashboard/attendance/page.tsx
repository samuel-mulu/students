"use client";

import { useState, useEffect } from "react";
import { useClasses } from "@/lib/hooks/use-classes";
import { useStudents } from "@/lib/hooks/use-students";
import {
  useAttendanceByClass,
  useBulkAttendance,
} from "@/lib/hooks/use-attendance";
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
import { useRouter } from "next/navigation";
import {
  Calendar,
  GraduationCap,
  Users,
  Check,
  X,
  Clock,
  Save,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AttendanceStatus } from "@/lib/types";
import { formatFullName, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";
import { useMemo } from "react";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import { useActiveAcademicYear } from "@/lib/hooks/use-academicYears";

export default function AttendancePage() {
  const router = useRouter();
  const { hasRole, user } = useAuthStore();
  const { data: activeYearData } = useActiveAcademicYear();
  
  // Role-based access control
  const canMarkAttendance = hasRole(["TEACHER"]);
  const canViewAttendance = hasRole(["TEACHER", "OWNER"]);
  const isTeacher = hasRole(["TEACHER"]);
  const activeYear = activeYearData?.data;
  
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
  const { data: classesData } = useClasses();
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
  
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const { data: studentsData, isLoading: studentsLoading, error: studentsError } = useStudents({
    classId: selectedClassId || undefined,
    classStatus: "assigned",
  });
  const { data: attendanceData, isLoading: attendanceLoading, error: attendanceError } =
    useAttendanceByClass(selectedClassId || "", selectedDate);
  const bulkAttendance = useBulkAttendance();

  const [attendanceStates, setAttendanceStates] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [attendanceNotes, setAttendanceNotes] = useState<Record<string, string>>({});

  // Check if attendance is recorded for the selected date
  const isAttendanceRecorded = useMemo(() => {
    if (!attendanceData?.data || !selectedClassId) return false;
    
    let attendanceArray: any[] = [];
    if (Array.isArray(attendanceData.data)) {
      attendanceArray = attendanceData.data;
    } else if (attendanceData.data.students) {
      attendanceArray = attendanceData.data.students.map((item: any) => ({
        ...item.attendance,
        studentId: item.student?.id || item.attendance?.studentId,
      })).filter((item: any) => item && item.id);
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
  };

  const handleNextDate = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (currentDate <= today) {
      setSelectedDate(currentDate.toISOString().split("T")[0]);
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
    if (attendanceData?.data && studentsData?.data) {
      const states: Record<string, AttendanceStatus> = {};
      const notes: Record<string, string> = {};
      
      // Handle different response structures
      let attendanceArray: any[] = [];
      if (Array.isArray(attendanceData.data)) {
        attendanceArray = attendanceData.data;
      } else if (attendanceData.data.students) {
        attendanceArray = attendanceData.data.students.map((item: any) => ({
          ...item.attendance,
          studentId: item.student?.id || item.attendance?.studentId,
        })).filter((item: any) => item && item.id);
      }
      
      studentsData.data.forEach((student) => {
        const existing = attendanceArray.find(
          (a: any) => a.studentId === student.id || 
          (a.student && a.student.id === student.id)
        );
        states[student.id] = existing?.status || "present";
        notes[student.id] = existing?.notes || "";
      });
      setAttendanceStates(states);
      setAttendanceNotes(notes);
    } else if (studentsData?.data && !isReadOnly) {
      // Only set default "present" if not in read-only mode (to avoid overwriting recorded data)
      const states: Record<string, AttendanceStatus> = {};
      const notes: Record<string, string> = {};
      studentsData.data.forEach((student) => {
        states[student.id] = "present";
        notes[student.id] = "";
      });
      setAttendanceStates(states);
      setAttendanceNotes(notes);
    }
  }, [attendanceData, studentsData, isReadOnly]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceStates((prev) => ({ ...prev, [studentId]: status }));
    // Clear notes if status changes to present
    if (status === 'present') {
      setAttendanceNotes((prev) => ({ ...prev, [studentId]: '' }));
    }
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendanceNotes((prev) => ({ ...prev, [studentId]: notes }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (studentsData?.data) {
      const states: Record<string, AttendanceStatus> = {};
      const notes: Record<string, string> = {};
      studentsData.data.forEach((student) => {
        states[student.id] = status;
        notes[student.id] = status === 'present' ? '' : '';
      });
      setAttendanceStates(states);
      setAttendanceNotes(notes);
    }
  };

  const handleSave = async () => {
    if (!studentsData?.data || !selectedClassId) return;

    // Check if attendance already exists before saving
    let attendanceArray: any[] = [];
    if (attendanceData?.data) {
      if (Array.isArray(attendanceData.data)) {
        attendanceArray = attendanceData.data;
      } else if (attendanceData.data.students) {
        attendanceArray = attendanceData.data.students.map((item: any) => ({
          ...item.attendance,
          studentId: item.student?.id || item.attendance?.studentId,
        })).filter((item: any) => item && item.id);
      }
    }

    if (attendanceArray.length > 0) {
      toast.warning("Attendance Already Recorded", {
        description: `Attendance for ${formatDate(selectedDate)} has already been recorded.`,
        duration: 4000,
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

      toast.success("Attendance Saved Successfully", {
        description: `Attendance for ${formatDate(selectedDate)} has been recorded. Present: ${presentCount}, Absent: ${absentCount}, Late: ${lateCount}`,
        duration: 5000,
      });

      // After saving, move to the next date
      const currentDate = new Date(selectedDate);
      currentDate.setDate(currentDate.getDate() + 1);
      const nextDateStr = currentDate.toISOString().split("T")[0];
      setSelectedDate(nextDateStr);

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
    } catch (error) {
      // Error handling is done by the mutation hook
      console.error("Failed to save attendance:", error);
    }
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
    <div className="space-y-4">
      {/* Combined Card: Select Class/Date and Students Attendance */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
          <div className="flex items-center justify-between">
              <CardTitle className="text-slate-900">Mark Attendance</CardTitle>
            {showAttendanceTable && selectedClassId && (
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
            )}
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
                <Label htmlFor="date" className="text-slate-700 font-semibold">
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
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      disabled={attendanceLoading}
                      className="border-slate-200"
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
                              const selectedClass = classes.find(c => c.id === selectedClassId);
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
                                        if (checked && canMarkAttendance && !isReadOnly) {
                                          handleStatusChange(
                                            student.id,
                                            "present"
                                          );
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
                                        if (checked && canMarkAttendance && !isReadOnly) {
                                          handleStatusChange(
                                            student.id,
                                            "absent"
                                          );
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
                                        if (checked && canMarkAttendance && !isReadOnly) {
                                          handleStatusChange(
                                            student.id,
                                            "late"
                                          );
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
    </div>
  );
}
