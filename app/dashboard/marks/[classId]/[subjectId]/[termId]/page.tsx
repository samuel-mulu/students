'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useClass } from '@/lib/hooks/use-classes';
import { useClassSubjects } from '@/lib/hooks/use-classes';
import { useTerms } from '@/lib/hooks/use-terms';
import { useSubExams } from '@/lib/hooks/use-subexams';
import { useStudents } from '@/lib/hooks/use-students';
import { useMarksByClassAndTerm, useRecordBulkMarks } from '@/lib/hooks/use-marks';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatFullName } from '@/lib/utils/format';
import { Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/shared/BackButton';
import { useRouter } from 'next/navigation';

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

  const recordBulkMarks = useRecordBulkMarks();
  const [marks, setMarks] = useState<Record<string, Record<string, number>>>({});
  const [savingColumns, setSavingColumns] = useState<Record<string, boolean>>({});

  const subject = subjectsData?.data?.find((s) => s.id === subjectId);
  const term = termsData?.data?.find((t) => t.id === termId);
  const students = Array.isArray(studentsData?.data) ? studentsData.data : [];
  
  // Sort students alphabetically by first name (A, B, C...)
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      return (a.firstName || '').localeCompare(b.firstName || '');
    });
  }, [students]);
  
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

  const handleSaveColumn = async (subExamId: string) => {
    if (!sortedStudents.length) return;

    setSavingColumns((prev) => ({ ...prev, [subExamId]: true }));

    // Collect all marks for this subExam
    const marksData = sortedStudents
      .map((student) => {
        const score = marks[student.id]?.[subExamId];
        // Only include if score is defined and not 0 (or if it's explicitly 0)
        if (score !== undefined && score !== null) {
          return {
            studentId: student.id,
            score: score,
          };
        }
        return null;
      })
      .filter((item): item is { studentId: string; score: number } => item !== null);

    if (marksData.length === 0) {
      setSavingColumns((prev) => ({ ...prev, [subExamId]: false }));
      return;
    }

    try {
      await recordBulkMarks.mutateAsync({
        subExamId,
        marksData,
      });
    } finally {
      setSavingColumns((prev) => ({ ...prev, [subExamId]: false }));
    }
  };

  if (!classData?.data || !subject || !term) {
    return <LoadingState rows={10} columns={5} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/dashboard/marks" />
      <div>
          <h1 className="text-xl font-semibold">Marks Entry</h1>
          <p className="text-sm text-muted-foreground mt-1">
          {classData.data.name} - {subject.name} - {term.name}
        </p>
        </div>
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
                  <TableHead className="w-16">NO</TableHead>
                  <TableHead className="sticky left-0 bg-background z-10">Student</TableHead>
                  <TableHead>Class</TableHead>
                  {subExams.map((subExam) => (
                    <TableHead key={subExam.id} className="min-w-[150px]">
                      <div className="text-center space-y-2">
                        <div className="font-medium">{subExam.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Max: {subExam.maxScore} ({subExam.weightPercent}%)
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSaveColumn(subExam.id)}
                          disabled={savingColumns[subExam.id] || recordBulkMarks.isPending}
                          className="w-full"
                        >
                          <Save className="mr-2 h-3 w-3" />
                          {savingColumns[subExam.id] ? 'Saving...' : 'Save Column'}
                        </Button>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={subExams.length + 3} className="text-center py-12 text-gray-500 text-sm">
                      No students found in this class
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedStudents.map((student, index) => {
                    // Get class name from student data
                    const getClassName = (student: any): string => {
                      if ('classHistory' in student && Array.isArray(student.classHistory)) {
                        const activeClass = student.classHistory.find((ch: any) => !ch.endDate);
                        if (activeClass?.class?.name) {
                          return activeClass.class.name;
                        }
                      }
                      return classData?.data?.name || 'Not Assigned';
                    };
                    const className = getClassName(student);
                    
                    return (
                  <TableRow key={student.id}>
                        <TableCell className="text-center font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium sticky left-0 bg-background z-10">
                          <div className="flex flex-col">
                            <h3 className="font-semibold">{formatFullName(student.firstName, student.lastName)}</h3>
                            <p className="text-xs text-gray-500">{className}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-blue-100 text-blue-800 border border-blue-300 font-medium">
                            {className}
                          </Badge>
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
                            className="w-full"
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
