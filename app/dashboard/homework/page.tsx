"use client";

import { DateField } from "@/components/shared/DateField";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useClasses, useClassSubjects } from "@/lib/hooks/use-classes";
import { useBulkHomework, useHomeworkByClass } from "@/lib/hooks/use-homework";
import { useStudents } from "@/lib/hooks/use-students";
import { useAuthStore } from "@/lib/store/auth-store";
import { HomeworkStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateForUI } from "@/lib/utils/date";
import { formatFullName } from "@/lib/utils/format";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  Save,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function HomeworkPage() {
  const router = useRouter();
  const { hasRole, user } = useAuthStore();
  const { data: activeYearData } = useActiveAcademicYear();
  const { calendarSystem } = useCalendarSystem();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [homeworkStates, setHomeworkStates] = useState<
    Record<string, HomeworkStatus>
  >({});
  const [homeworkNotes, setHomeworkNotes] = useState<Record<string, string>>(
    {},
  );
  const [isDirty, setIsDirty] = useState(false);

  const { data: classesData } = useClasses();
  const {
    data: studentsData,
    isLoading: studentsLoading,
    error: studentsError,
  } = useStudents({
    classId: selectedClassId || undefined,
    classStatus: "assigned",
    page: 1,
    limit: 1000,
  });
  const { data: subjectsData } = useClassSubjects(selectedClassId || "");
  const {
    data: homeworkData,
    isLoading: homeworkLoading,
    refetch: refetchHomework,
  } = useHomeworkByClass(
    selectedClassId || "",
    selectedDate,
    selectedSubjectId || undefined,
  );
  const bulkHomework = useBulkHomework();

  // Role-based access control
  const canViewHomework = hasRole(["TEACHER", "OWNER"]);
  const isTeacher = hasRole(["TEACHER"]);
  const activeYear = activeYearData?.data;

  // Memoize all data arrays to prevent hook dependency issues
  const allClasses = useMemo(() => {
    return Array.isArray(classesData?.data) ? classesData.data : [];
  }, [classesData]);

  const subjects = useMemo(() => {
    return Array.isArray(subjectsData?.data) ? subjectsData.data : [];
  }, [subjectsData]);

  // Filter classes for teachers
  const classes = useMemo(() => {
    if (!isTeacher) {
      return allClasses;
    }

    if (!activeYear || !activeYear.id) {
      return [];
    }

    const activeYearClasses = allClasses.filter((cls) => {
      if (cls.academicYearId) {
        return cls.academicYearId === activeYear.id;
      }
      if (typeof cls.academicYear === "string") {
        return cls.academicYear === activeYear.name;
      }
      if (typeof cls.academicYear === "object" && cls.academicYear?.id) {
        return cls.academicYear.id === activeYear.id;
      }
      return false;
    });

    if (user?.teacherClasses && user.teacherClasses.length > 0) {
      const assignedClassIds = user.teacherClasses.map((tc) => tc.id);
      return activeYearClasses.filter((cls) =>
        assignedClassIds.includes(cls.id),
      );
    }

    return [];
  }, [isTeacher, user, activeYear, allClasses]);

  // Check if homework is recorded for the selected date and subject
  const isHomeworkRecorded = useMemo(() => {
    if (!homeworkData?.data || !selectedClassId || !selectedSubjectId) {
      return false;
    }

    // Simple check: if API returns students array, check if any student has homework
    if (homeworkData.data.students) {
      const studentsArray = homeworkData.data.students as Array<{
        homework: unknown[];
      }>;

      const hasHomework = studentsArray.some((item) => {
        if (!Array.isArray(item.homework)) return false;
        const hasAnyHomework = item.homework.length > 0;
        return hasAnyHomework;
      });

      return hasHomework;
    }

    // Fallback for array format
    if (Array.isArray(homeworkData.data)) {
      return homeworkData.data.length > 0;
    }

    return false;
  }, [homeworkData, selectedClassId, selectedSubjectId]);

  // Determine if we're in read-only mode (past date with recorded homework)
  const isReadOnly = useMemo(() => {
    if (!isHomeworkRecorded) return false;
    const selected = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  }, [isHomeworkRecorded, selectedDate]);

  // Initialize homework states from API data
  useEffect(() => {
    const hasLocalStates = Object.keys(homeworkStates).length > 0;

    if (
      homeworkData?.data &&
      studentsData?.data &&
      selectedSubjectId &&
      (!isDirty || !hasLocalStates)
    ) {
      const states: Record<string, HomeworkStatus> = {};
      const notes: Record<string, string> = {};

      // The API returns { class, date, students: [{ student, homework: [] }] }
      const homeworkMap = new Map<
        string,
        { status: HomeworkStatus; notes: string }
      >();

      if (homeworkData.data.students) {
        homeworkData.data.students.forEach(
          (item: { student: { id: string }; homework: unknown[] }) => {
            if (Array.isArray(item.homework)) {
              // Find homework for this subject
              const hw = item.homework.find((h: unknown) => {
                const hwRecord = h as { subjectId?: string };
                return hwRecord.subjectId === selectedSubjectId;
              }) as { status?: HomeworkStatus; notes?: string } | undefined;

              if (hw && hw.status) {
                homeworkMap.set(item.student.id, {
                  status: hw.status,
                  notes: hw.notes || "",
                });
              }
            }
          },
        );
      }

      studentsData.data.forEach((student) => {
        const existing = homeworkMap.get(student.id);
        states[student.id] = existing?.status || "not_done";
        notes[student.id] = existing?.notes || "";
      });

      // Use setTimeout to avoid synchronous state setting warning
      setTimeout(() => {
        setHomeworkStates(states);
        setHomeworkNotes(notes);
        setIsDirty(false);
      }, 0);
    } else if (
      studentsData?.data &&
      selectedSubjectId &&
      (!isDirty || !hasLocalStates)
    ) {
      const states: Record<string, HomeworkStatus> = {};
      const notes: Record<string, string> = {};
      studentsData.data.forEach((student) => {
        states[student.id] = "not_done";
        notes[student.id] = "";
      });
      // Use setTimeout to avoid synchronous state setting warning
      setTimeout(() => {
        setHomeworkStates(states);
        setHomeworkNotes(notes);
        setIsDirty(false);
      }, 0);
    }
  }, [
    homeworkData,
    studentsData,
    isDirty,
    selectedClassId,
    selectedSubjectId,
    selectedDate,
  ]);

  const handleStatusChange = (studentId: string, status: HomeworkStatus) => {
    setIsDirty(true);
    setHomeworkStates((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setIsDirty(true);
    setHomeworkNotes((prev) => ({ ...prev, [studentId]: notes }));
  };

  const handleMarkAll = (status: HomeworkStatus) => {
    if (studentsData?.data) {
      setIsDirty(true);
      const states: Record<string, HomeworkStatus> = {};
      studentsData.data.forEach((student) => {
        states[student.id] = status;
      });
      setHomeworkStates(states);
    }
  };

  // Date navigation functions
  const handlePreviousDate = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(currentDate.toISOString().split("T")[0]);
    setIsDirty(false);
  };

  const handleNextDate = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (currentDate <= today) {
      setSelectedDate(currentDate.toISOString().split("T")[0]);
      setIsDirty(false);
    }
  };

  const canGoNext = useMemo(() => {
    const currentDate = new Date(selectedDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    currentDate.setHours(23, 59, 59, 999);
    return currentDate < today;
  }, [selectedDate]);

  const handleSave = async () => {
    if (
      !studentsData?.data ||
      !selectedClassId ||
      !selectedSubjectId ||
      !title.trim()
    ) {
      toast.error("Missing Information", {
        description: "Please fill in class, subject, title, and date.",
      });
      return;
    }

    // We allow updates now, so we don't block if homework is already recorded.
    // However, if it is recorded and isReadOnly (past date), it's blocked.
    if (isReadOnly) {
      toast.error("Cannot Update Past Homework", {
        description: "Viewing recorded homework for a past date is read-only.",
      });
      return;
    }

    const homeworkDataToSave = studentsData.data.map((student) => {
      const status = homeworkStates[student.id] || "not_done";
      return {
        studentId: student.id,
        status,
        notes: homeworkNotes[student.id] || "",
      };
    });

    try {
      await bulkHomework.mutateAsync({
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        date: selectedDate,
        homeworkData: homeworkDataToSave,
      });

      const doneCount = homeworkDataToSave.filter(
        (h) => h.status === "done",
      ).length;
      const notDoneCount = homeworkDataToSave.filter(
        (h) => h.status === "not_done",
      ).length;

      toast.success(
        isHomeworkRecorded ? "Homework Updated" : "Homework Saved Successfully",
        {
          description: `Homework for ${formatDateForUI(selectedDate, calendarSystem)} has been recorded. Done: ${doneCount}, Not Done: ${notDoneCount}`,
          duration: 5000,
        },
      );

      setIsDirty(false);
      // Refetch homework data to update the "Recorded" badge
      await refetchHomework();

      // Don't clear title/description on update, only on new record
      if (!isHomeworkRecorded) {
        setTitle("");
        setDescription("");
      }
    } catch (error) {
      console.error("Failed to save homework:", error);
    }
  };

  const students = useMemo(() => {
    return Array.isArray(studentsData?.data) ? studentsData.data : [];
  }, [studentsData]);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      return (a.firstName || "").localeCompare(b.firstName || "");
    });
  }, [students]);

  const showHomeworkTable = !!selectedClassId && !!selectedSubjectId;
  const hasStudents = sortedStudents.length > 0;

  // If user doesn't have permission to view, show error (moved after all hooks)
  if (!canViewHomework) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                You don&apos;t have permission to view homework. Only teachers
                and owners can access this page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (studentsLoading || homeworkLoading) {
    return <LoadingState />;
  }

  if (studentsError) {
    return (
      <ErrorState
        title="Error Loading Students"
        message={studentsError.message || "Failed to load students"}
      />
    );
  }

  return (
    <div className="space-y-4 relative">
      {bulkHomework.isPending && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4 border border-blue-100">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <div className="text-center">
              <p className="font-bold text-slate-800 text-lg">
                Recording Homework...
              </p>
              <p className="text-sm text-slate-500">
                Please wait while we sync with the server.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900">Assign Homework</CardTitle>
            <div className="flex items-center gap-2">
              {showHomeworkTable && selectedClassId && (
                <Button
                  onClick={() => {
                    router.push(
                      `/dashboard/homework/${selectedClassId}?date=${selectedDate}&history=true`,
                    );
                  }}
                  variant="outline"
                  size="sm"
                >
                  <History className="mr-2 h-4 w-4" />
                  View History
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Class, Subject, and Date Selection */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="class" className="text-slate-700 font-semibold">
                  Class *
                </Label>
                <Select
                  value={selectedClassId}
                  onValueChange={(value) => {
                    setSelectedClassId(value);
                    setSelectedSubjectId("");
                  }}
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
                <Label
                  htmlFor="subject"
                  className="text-slate-700 font-semibold"
                >
                  Subject *
                </Label>
                <Select
                  value={selectedSubjectId}
                  onValueChange={setSelectedSubjectId}
                  disabled={!selectedClassId}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {selectedClassId
                          ? "No subjects found"
                          : "Select a class first"}
                      </div>
                    ) : (
                      subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Date *</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousDate}
                    disabled={homeworkLoading}
                    className="border-slate-200"
                    title="Previous day"
                  >
                    {homeworkLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="flex-1 relative">
                    <DateField
                      valueISO={selectedDate}
                      onChangeISO={setSelectedDate}
                      disabled={homeworkLoading}
                      className="flex-1"
                    />
                    {isHomeworkRecorded && (
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
                    disabled={!canGoNext || homeworkLoading}
                    className="border-slate-200"
                    title="Next day"
                  >
                    {homeworkLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {/* Display formatted date */}
                {selectedDate && (
                  <p className="text-xs text-muted-foreground">
                    {formatDateForUI(selectedDate, calendarSystem)}
                  </p>
                )}
              </div>
            </div>

            {/* Title and Description */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-700 font-semibold">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter homework title"
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-slate-700 font-semibold"
                >
                  Description
                </Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter homework description (optional)"
                  className="border-slate-200"
                />
              </div>
            </div>

            {/* Homework Table */}
            {showHomeworkTable && (
              <div className="space-y-4">
                {hasStudents ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleMarkAll("done")}
                          variant="outline"
                          size="sm"
                          className="border-green-200 hover:bg-green-50 text-green-700"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Mark All Done
                        </Button>
                        <Button
                          onClick={() => handleMarkAll("not_done")}
                          variant="outline"
                          size="sm"
                          className="border-red-200 hover:bg-red-50 text-red-700"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Mark All Not Done
                        </Button>
                      </div>
                      <Button
                        onClick={handleSave}
                        disabled={
                          !isDirty ||
                          !title.trim() ||
                          bulkHomework.isPending ||
                          isReadOnly
                        }
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isHomeworkRecorded
                          ? "Update Homework"
                          : "Save Homework"}
                      </Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="w-12">Status</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedStudents.map((student) => {
                            const status =
                              homeworkStates[student.id] || "not_done";
                            return (
                              <TableRow key={student.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={status === "done"}
                                      onCheckedChange={(checked) => {
                                        handleStatusChange(
                                          student.id,
                                          checked ? "done" : "not_done",
                                        );
                                      }}
                                      disabled={isReadOnly}
                                    />
                                    <Badge
                                      variant={
                                        status === "done"
                                          ? "default"
                                          : "secondary"
                                      }
                                      className={cn(
                                        status === "done"
                                          ? "bg-green-100 text-green-700 border-green-200"
                                          : "bg-red-100 text-red-700 border-red-200",
                                      )}
                                    >
                                      {status === "done" ? "Done" : "Not Done"}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatFullName(
                                    student.firstName,
                                    student.lastName,
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={homeworkNotes[student.id] || ""}
                                    onChange={(e) =>
                                      handleNotesChange(
                                        student.id,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Optional notes"
                                    className="max-w-xs"
                                    disabled={isReadOnly}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">
                      No students found in this class.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
