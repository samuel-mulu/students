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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { BackButton } from '@/components/shared/BackButton';

export default function ResultsPage() {
  const router = useRouter();
  const { hasRole, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'continuous' | 'roster'>('continuous');
  const { data: classesData } = useClasses();
  const allClasses = Array.isArray(classesData?.data) ? classesData.data : [];
  const { data: termsData } = useTerms();
  const allTerms = Array.isArray(termsData?.data) ? termsData.data : [];
  const { data: academicYearsData } = useAcademicYears();
  const allAcademicYears = Array.isArray(academicYearsData?.data) ? academicYearsData.data : [];
  const { data: activeYearData } = useActiveAcademicYear();
  const activeYear = activeYearData?.data;
  const isTeacher = hasRole(['TEACHER']);

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

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'continuous' | 'roster');
    // Reset filters when switching tabs
    setSelectedClassId('');
    setSelectedSubjectId('');
    setSelectedTermId('');
  };

  const handleContinue = () => {
    if (activeTab === 'continuous') {
      if (selectedClassId && selectedSubjectId && selectedTermId) {
        router.push(
          `/dashboard/results/continuous/${selectedClassId}/${selectedSubjectId}/${selectedTermId}`
        );
      }
    } else if (activeTab === 'roster') {
      if (selectedClassId && selectedTermId) {
        router.push(
          `/dashboard/results/roster/${selectedClassId}/${selectedTermId}`
        );
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/dashboard" />
        <div>
          <h1 className="text-xl font-semibold">Results</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record and manage student results
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="continuous">Continuous</TabsTrigger>
          <TabsTrigger value="roster">Roster</TabsTrigger>
        </TabsList>

        <TabsContent value="continuous" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Class, Subject, and Term</CardTitle>
              <CardDescription>Choose a class, subject, and term to enter continuous results</CardDescription>
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
        </TabsContent>

        <TabsContent value="roster" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Class and Term</CardTitle>
              <CardDescription>Choose a class and term to view roster results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="roster-academicYear">Academic Year</Label>
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
                  <Label htmlFor="roster-class">Class *</Label>
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
                  <Label htmlFor="roster-term">Term *</Label>
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
                disabled={!selectedClassId || !selectedTermId}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

