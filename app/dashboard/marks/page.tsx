'use client';

import { useState } from 'react';
import { useClasses } from '@/lib/hooks/use-classes';
import { useClassSubjects } from '@/lib/hooks/use-classes';
import { useTerms } from '@/lib/hooks/use-terms';
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

export default function MarksPage() {
  const router = useRouter();
  const { data: classesData } = useClasses();
  const classes = Array.isArray(classesData?.data) ? classesData.data : [];
  const { data: termsData } = useTerms();
  const terms = Array.isArray(termsData?.data) ? termsData.data : [];

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  const { data: subjectsData } = useClassSubjects(selectedClassId);
  const subjects = Array.isArray(subjectsData?.data) ? subjectsData.data : [];

  const handleContinue = () => {
    if (selectedClassId && selectedSubjectId && selectedTermId) {
      router.push(
        `/dashboard/marks/${selectedClassId}/${selectedSubjectId}/${selectedTermId}`
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Marks</h1>
        <p className="text-body text-muted-foreground mt-1">
          Record and manage student marks
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Class, Subject, and Term</CardTitle>
          <CardDescription>Choose a class, subject, and term to enter marks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="class">Class *</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
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
              <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
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

