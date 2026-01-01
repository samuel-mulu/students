'use client';

import { use, useState, useEffect } from 'react';
import { useClass } from '@/lib/hooks/use-classes';
import { useClassSubjects } from '@/lib/hooks/use-classes';
import { useTerms } from '@/lib/hooks/use-terms';
import { useSubExams } from '@/lib/hooks/use-subexams';
import { useStudents } from '@/lib/hooks/use-students';
import { useMarksByClassAndTerm, useRecordMark } from '@/lib/hooks/use-marks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatFullName } from '@/lib/utils/format';
import { useState } from 'react';

export default function MarksEntryPage({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string; termId: string }>;
}) {
  const { classId, subjectId, termId } = use(params);
  const { data: classData } = useClass(classId);
  const { data: subjectsData } = useClassSubjects(classId);
  const { data: termsData } = useTerms();
  const { data: subExamsData } = useSubExams(subjectId, termId);
  const { data: studentsData } = useStudents({ classId, classStatus: 'assigned' });
  const { data: marksData } = useMarksByClassAndTerm(classId, subjectId, termId);

  const recordMark = useRecordMark();
  const [marks, setMarks] = useState<Record<string, Record<string, number>>>({});

  const subject = subjectsData?.data?.find((s) => s.id === subjectId);
  const term = termsData?.data?.find((t) => t.id === termId);
  const students = Array.isArray(studentsData?.data) ? studentsData.data : [];
  const subExams = Array.isArray(subExamsData?.data) ? subExamsData.data : [];
  const existingMarks = Array.isArray(marksData?.data) ? marksData.data : [];

  // Initialize marks from existing data
  useEffect(() => {
    if (existingMarks.length > 0) {
      const initialMarks: Record<string, Record<string, number>> = {};
      existingMarks.forEach((mark) => {
        if (!initialMarks[mark.studentId]) {
          initialMarks[mark.studentId] = {};
        }
        initialMarks[mark.studentId][mark.subExamId] = mark.score;
      });
      setMarks(initialMarks);
    }
  }, [existingMarks]);

  const handleScoreChange = (studentId: string, subExamId: string, score: number) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subExamId]: score,
      },
    }));
  };

  const handleSave = async (studentId: string, subExamId: string) => {
    const score = marks[studentId]?.[subExamId];
    if (score !== undefined) {
      await recordMark.mutateAsync({
        studentId,
        subExamId,
        data: { score },
      });
    }
  };

  if (!classData?.data || !subject || !term) {
    return <LoadingState rows={10} columns={5} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Marks Entry</h1>
        <p className="text-body text-muted-foreground mt-1">
          {classData.data.name} - {subject.name} - {term.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enter Marks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Student</TableHead>
                  {subExams.map((subExam) => (
                    <TableHead key={subExam.id} className="min-w-[120px]">
                      <div className="text-center">
                        <div className="font-medium">{subExam.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Max: {subExam.maxScore} ({subExam.weightPercent}%)
                        </div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium sticky left-0 bg-background">
                      {formatFullName(student.firstName, student.lastName)}
                    </TableCell>
                    {subExams.map((subExam) => {
                      const currentScore =
                        marks[student.id]?.[subExam.id] ??
                        existingMarks.find(
                          (m) => m.studentId === student.id && m.subExamId === subExam.id
                        )?.score ??
                        0;
                      return (
                        <TableCell key={subExam.id}>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={subExam.maxScore}
                              step="0.01"
                              value={currentScore}
                              onChange={(e) =>
                                handleScoreChange(
                                  student.id,
                                  subExam.id,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-20"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSave(student.id, subExam.id)}
                              disabled={recordMark.isPending}
                            >
                              Save
                            </Button>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

