'use client';

import { useState, useMemo } from 'react';
import { useClasses } from '@/lib/hooks/use-classes';
import { useClassSubjects } from '@/lib/hooks/use-classes';
import { useTerms } from '@/lib/hooks/use-terms';
import { useAcademicYears } from '@/lib/hooks/use-academicYears';
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
  const { data: classesData } = useClasses();
  const classes = Array.isArray(classesData?.data) ? classesData.data : [];
  const { data: termsData } = useTerms();
  const allTerms = Array.isArray(termsData?.data) ? termsData.data : [];
  const { data: academicYearsData } = useAcademicYears();
  const academicYears = Array.isArray(academicYearsData?.data) ? academicYearsData.data : [];

  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  const { data: subjectsData } = useClassSubjects(selectedClassId);
  const subjects = Array.isArray(subjectsData?.data) ? subjectsData.data : [];

  // Filter classes by academic year
  const filteredClasses = useMemo(() => {
    if (!selectedAcademicYearId) return classes;
    return classes.filter((cls) => cls.academicYearId === selectedAcademicYearId);
  }, [classes, selectedAcademicYearId]);

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
              <Select value={selectedAcademicYearId || "all"} onValueChange={(value) => handleAcademicYearChange(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select academic year (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Academic Years</SelectItem>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
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
                  {filteredClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
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

