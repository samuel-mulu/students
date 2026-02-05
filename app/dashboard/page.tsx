"use client";

import { ArchivedYearsModal } from "@/components/shared/ArchivedYearsModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    useAcademicYears,
    useActiveAcademicYear,
} from "@/lib/hooks/use-academicYears";
import { useClasses } from "@/lib/hooks/use-classes";
import { useStudents } from "@/lib/hooks/use-students";
import { useTeachers } from "@/lib/hooks/use-users";
import { useAuthStore } from "@/lib/store/auth-store";
import {
    Archive,
    BarChart3,
    Calendar,
    ChevronRight,
    DollarSign,
    GraduationCap,
    UserCog,
    Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isOwner = user?.role === "OWNER";
  const isTeacher = user?.role === "TEACHER";

  // Data hooks
  const { data: activeYearData, isLoading: activeYearLoading } =
    useActiveAcademicYear();
  const { data: academicYearsData } = useAcademicYears();
  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    classStatus: "assigned",
  });
  const { data: classesData, isLoading: classesLoading } = useClasses();
  const { data: teachersData, isLoading: teachersLoading } = useTeachers();

  const activeYear = activeYearData?.data;
  const academicYears = Array.isArray(academicYearsData?.data)
    ? academicYearsData.data
    : [];
  const allStudents = Array.isArray(studentsData?.data)
    ? studentsData.data
    : [];
  const allClasses = Array.isArray(classesData?.data) ? classesData.data : [];
  const allTeachers = Array.isArray(teachersData?.data)
    ? teachersData.data
    : [];

  // Filter data by active academic year
  const activeYearDataFiltered = useMemo(() => {
    if (!activeYear) return null;

    // Filter classes from active academic year
    const activeClasses = allClasses.filter(
      (cls) => cls.academicYearId === activeYear.id,
    );

    // Filter teachers who are head teachers of classes in active academic year
    const activeTeacherIds = new Set(
      activeClasses
        .filter((cls) => cls.headTeacherId)
        .map((cls) => cls.headTeacherId!),
    );
    const activeTeachers = allTeachers.filter((teacher) =>
      activeTeacherIds.has(teacher.id),
    );

    // For students, use the total count from pagination since we need all active students
    // The backend already filters by classStatus: 'assigned' which means active students
    const totalActiveStudents = studentsData?.pagination?.total || 0;

    return {
      studentsCount: totalActiveStudents,
      classesCount: activeClasses.length,
      teachersCount: activeTeachers.length,
    };
  }, [activeYear, allClasses, allTeachers, studentsData]);

  // Get archived academic years
  const archivedYears = useMemo(() => {
    return academicYears.filter((year) => year.status === "CLOSED");
  }, [academicYears]);

  // Get teacher's classes (for Teacher dashboard)
  const teacherClasses = useMemo(() => {
    if (!isTeacher || !user?.id || !activeYear) return [];
    return allClasses.filter(
      (cls) =>
        cls.headTeacherId === user.id && cls.academicYearId === activeYear.id,
    );
  }, [isTeacher, user?.id, activeYear, allClasses]);

  const [archivedModalOpen, setArchivedModalOpen] = useState(false);

  const isLoading =
    activeYearLoading || studentsLoading || classesLoading || teachersLoading;

  if (isLoading) {
    return <LoadingState rows={5} columns={4} />;
  }

  // Owner Dashboard
  if (isOwner) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {user?.name}
          </p>
        </div>

        {/* Row 1: Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Total Active Students
                  </p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {activeYearDataFiltered?.studentsCount ?? "-"}
                  </p>
                  {activeYear && (
                    <p className="text-xs text-blue-600 mt-1">
                      {activeYear.name}
                    </p>
                  )}
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">
                    Active Classes
                  </p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {activeYearDataFiltered?.classesCount ?? "-"}
                  </p>
                  {activeYear && (
                    <p className="text-xs text-green-600 mt-1">
                      {activeYear.name}
                    </p>
                  )}
                </div>
                <GraduationCap className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">
                    Teachers
                  </p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    {activeYearDataFiltered?.teachersCount ?? "-"}
                  </p>
                  {activeYear && (
                    <p className="text-xs text-purple-600 mt-1">
                      {activeYear.name}
                    </p>
                  )}
                </div>
                <UserCog className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">
                    Academic Year
                  </p>
                  <p className="text-lg font-bold text-orange-900 mt-1">
                    {activeYear ? activeYear.name : "No active year"}
                  </p>
                  {activeYear && (
                    <Badge className="mt-1 bg-orange-600 text-white">
                      ACTIVE
                    </Badge>
                  )}
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/dashboard/students">
                <Card className="hover:bg-accent cursor-pointer transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="font-medium">Students</p>
                        <p className="text-xs text-muted-foreground">
                          Manage students
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dashboard/classes">
                <Card className="hover:bg-accent cursor-pointer transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-medium">Classes</p>
                        <p className="text-xs text-muted-foreground">
                          Manage classes
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dashboard/payments">
                <Card className="hover:bg-accent cursor-pointer transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-6 w-6 text-yellow-600" />
                      <div>
                        <p className="font-medium">Payments</p>
                        <p className="text-xs text-muted-foreground">
                          Manage payments
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dashboard/reports">
                <Card className="hover:bg-accent cursor-pointer transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                      <div>
                        <p className="font-medium">Reports</p>
                        <p className="text-xs text-muted-foreground">
                          View reports
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Row 3: Archived Data Entry Point */}
        <Card>
          <CardHeader>
            <CardTitle>Archived Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setArchivedModalOpen(true)}
            >
              <div className="flex items-center gap-3">
                <Archive className="h-5 w-5" />
                <span>Archived Academic Years</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {archivedYears.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                No archived academic years
              </p>
            )}
          </CardContent>
        </Card>

        <ArchivedYearsModal
          open={archivedModalOpen}
          onOpenChange={setArchivedModalOpen}
          archivedYears={archivedYears}
        />
      </div>
    );
  }

  // Teacher Dashboard
  if (isTeacher) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">My Classes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {user?.name}
          </p>
          {activeYear && (
            <p className="text-xs text-muted-foreground mt-1">
              Active Academic Year: {activeYear.name}
            </p>
          )}
        </div>

        {teacherClasses.length === 0 ? (
          <EmptyState
            title="No classes assigned"
            description="You don't have any classes assigned in the active academic year"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teacherClasses.map((classItem) => {
              const studentCount =
                "studentClasses" in classItem &&
                Array.isArray(classItem.studentClasses)
                  ? classItem.studentClasses.filter((sc: any) => !sc.endDate)
                      .length
                  : 0;

              return (
                <Link
                  key={classItem.id}
                  href={`/dashboard/classes/${classItem.id}`}
                >
                  <Card className="hover:bg-accent cursor-pointer transition-colors h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{classItem.name}</span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {studentCount} student{studentCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {classItem.description && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {classItem.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Fallback for other roles (REGISTRAR)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {user?.name}
        </p>
      </div>
      <EmptyState
        title="Dashboard not available"
        description="Dashboard view is not configured for your role"
      />
    </div>
  );
}
