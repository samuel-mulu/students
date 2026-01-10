'use client';

import { useState, useMemo, useEffect } from 'react';
import { useClasses } from '@/lib/hooks/use-classes';
import { useClassSubjects } from '@/lib/hooks/use-classes';
import { useTerms } from '@/lib/hooks/use-terms';
import { useAcademicYears, useActiveAcademicYear } from '@/lib/hooks/use-academicYears';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { BackButton } from '@/components/shared/BackButton';

export default function MarksPage() {
  const router = useRouter();
  const { hasRole, user } = useAuthStore();
  const { data: classesData } = useClasses();
  const allClasses = Array.isArray(classesData?.data) ? classesData.data : [];
  const { data: termsData } = useTerms();
  const allTerms = Array.isArray(termsData?.data) ? termsData.data : [];
  const { data: academicYearsData } = useAcademicYears();
  const allAcademicYears = Array.isArray(academicYearsData?.data) ? academicYearsData.data : [];
  const { data: activeYearData } = useActiveAcademicYear();
  const activeYear = activeYearData?.data;
  const isTeacher = hasRole(['TEACHER']);

  // Filter classes for teachers: show only assigned classes from active academic year
  const classes = useMemo(() => {
    if (isTeacher && user?.teacherClasses && activeYear) {
      const assignedClassIds = user.teacherClasses.map((tc) => tc.id);
      return allClasses.filter(
        (cls) =>
          assignedClassIds.includes(cls.id) &&
          cls.academicYearId === activeYear.id
      );
    }
    // For owners, show all classes
    return allClasses;
  }, [isTeacher, user?.teacherClasses, activeYear, allClasses]);

  // Filter academic years for teachers: show only active academic year
  const academicYears = useMemo(() => {
    if (isTeacher && activeYear) {
      return [activeYear];
    }
    // For owners, show all academic years
    return allAcademicYears;
  }, [isTeacher, activeYear, allAcademicYears]);

  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  // Auto-select active academic year for teachers
  useEffect(() => {
    if (isTeacher && activeYear && !selectedAcademicYearId) {
      setSelectedAcademicYearId(activeYear.id);
    }
  }, [isTeacher, activeYear, selectedAcademicYearId]);

  const { data: subjectsData } = useClassSubjects(selectedClassId);
  const subjects = Array.isArray(subjectsData?.data) ? subjectsData.data : [];

  // Filter classes by academic year (additional filtering for owners)
  const filteredClasses = useMemo(() => {
    // For teachers, classes are already filtered to active academic year, so return as-is
    if (isTeacher) return classes;
    // For owners, filter by selected academic year if one is selected
    if (!selectedAcademicYearId) return classes;
    return classes.filter((cls) => cls.academicYearId === selectedAcademicYearId);
  }, [classes, selectedAcademicYearId, isTeacher]);

  // Filter terms by academic year
  const filteredTerms = useMemo(() => {
    if (!selectedAcademicYearId) return allTerms;
    return allTerms.filter((term) => term.academicYearId === selectedAcademicYearId);
  }, [allTerms, selectedAcademicYearId]);

  // Get academic year from selected class if not explicitly selected
  const selectedClass = classes.find((cls) => cls.id === selectedClassId);
  const effectiveAcademicYearId = selectedAcademicYearId || selectedClass?.academicYearId || '';

  // Update filtered terms based on effective academic year
  const availableTerms = useMemo(() => {
    if (!effectiveAcademicYearId) return allTerms;
    return allTerms.filter((term) => term.academicYearId === effectiveAcademicYearId);
  }, [allTerms, effectiveAcademicYearId]);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedSubjectId('');
    setSelectedTermId('');
    // Auto-select academic year from class if not already selected
    const cls = classes.find((c) => c.id === classId);
    if (cls?.academicYearId && !selectedAcademicYearId) {
      setSelectedAcademicYearId(cls.academicYearId);
    }
  };

  const handleAcademicYearChange = (yearId: string) => {
    setSelectedAcademicYearId(yearId);
    setSelectedClassId('');
    setSelectedSubjectId('');
    setSelectedTermId('');
  };

  const handleContinue = () => {
    if (selectedClassId && selectedSubjectId && selectedTermId) {
      router.push(
        `/dashboard/marks/${selectedClassId}/${selectedSubjectId}/${selectedTermId}`
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/dashboard" />
      <div>
          <h1 className="text-xl font-semibold">Marks</h1>
          <p className="text-sm text-muted-foreground mt-1">
          Record and manage student marks
        </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Class, Subject, and Term</CardTitle>
          <CardDescription>Choose a class, subject, and term to enter marks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Select
                value={selectedAcademicYearId || "all"}
                onValueChange={(value) => handleAcademicYearChange(value === "all" ? "" : value)}
                disabled={isTeacher && !!activeYear}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isTeacher && activeYear ? activeYear.name : "Select academic year (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  {!isTeacher && <SelectItem value="all">All Academic Years</SelectItem>}
                  {academicYears.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {isTeacher && !activeYear
                        ? "No active academic year found. Please contact administrator."
                        : "No academic years available"}
                    </div>
                  ) : (
                    academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class">Class *</Label>
              <Select value={selectedClassId} onValueChange={handleClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {filteredClasses.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {isTeacher && activeYear
                        ? `No assigned classes found in active academic year (${activeYear.name})`
                        : isTeacher && !activeYear
                        ? "No active academic year found. Please contact administrator."
                        : "No classes available"}
                    </div>
                  ) : (
                    filteredClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Select
                value={selectedSubjectId}
                onValueChange={setSelectedSubjectId}
                disabled={!selectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="term">Term *</Label>
              <Select
                value={selectedTermId}
                onValueChange={setSelectedTermId}
                disabled={!effectiveAcademicYearId && !selectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a term" />
                </SelectTrigger>
                <SelectContent>
                  {availableTerms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleContinue}
            disabled={!selectedClassId || !selectedSubjectId || !selectedTermId}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

