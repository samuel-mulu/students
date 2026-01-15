'use client';

import { use, useState, useEffect, useMemo, useRef } from 'react';
import { useClass } from '@/lib/hooks/use-classes';
import { useClassSubjects } from '@/lib/hooks/use-classes';
import { useTerms } from '@/lib/hooks/use-terms';
import { useSubExams } from '@/lib/hooks/use-subexams';
import { useStudents } from '@/lib/hooks/use-students';
import { useResultsByClassAndTerm, useRecordBulkResults, useRecordResult } from '@/lib/hooks/use-results';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatFullName, getInitials } from '@/lib/utils/format';
import { useDebouncedCallback } from '@/lib/utils/debounce';
import { Save, CheckCircle2, Clock, AlertCircle, FileText, ClipboardList, BookOpen, GraduationCap, Users, TrendingUp, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/shared/BackButton';
import { useRouter } from 'next/navigation';
import { SubExam } from '@/lib/types';

export default function ContinuousResultsPage({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string; termId: string }>;
}) {
  const { classId, subjectId, termId } = use(params);
  const { data: classData } = useClass(classId);
  const { data: subjectsData } = useClassSubjects(classId);
  const { data: termsData } = useTerms();
  
  // Get gradeId from class
  const gradeId = classData?.data?.gradeId || '';
  const { data: subExamsData } = useSubExams(gradeId, subjectId);
  const { data: studentsData } = useStudents({ classId, classStatus: 'assigned' });
  const { data: marksData } = useResultsByClassAndTerm(classId, subjectId, termId);

  const recordBulkMarks = useRecordBulkResults();
  const recordMark = useRecordResult();
  const [marks, setMarks] = useState<Record<string, Record<string, number>>>({});
  
  // Save status tracking: 'saved' | 'saving' | 'unsaved'
  const [saveStatus, setSaveStatus] = useState<Record<string, Record<string, 'saved' | 'saving' | 'unsaved'>>>({});
  
  // Track which marks have been saved (from database)
  const [savedMarks, setSavedMarks] = useState<Record<string, Record<string, number>>>({});
  
  // Track pending saves to prevent duplicate saves
  const pendingSavesRef = useRef<Set<string>>(new Set());

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
      const initialSaved: Record<string, Record<string, number>> = {};
      const initialStatus: Record<string, Record<string, 'saved' | 'saving' | 'unsaved'>> = {};
      
      existingMarks.forEach((mark) => {
        if (!initialMarks[mark.studentId]) {
          initialMarks[mark.studentId] = {};
          initialSaved[mark.studentId] = {};
          initialStatus[mark.studentId] = {};
        }
        initialMarks[mark.studentId][mark.subExamId] = mark.score;
        initialSaved[mark.studentId][mark.subExamId] = mark.score;
        initialStatus[mark.studentId][mark.subExamId] = 'saved';
      });
      setMarks(initialMarks);
      setSavedMarks(initialSaved);
      setSaveStatus(initialStatus);
    }
  }, [existingMarks]);

  // Group sub-exams by exam type
  const groupedSubExams = useMemo(() => {
    const groups: Record<string, SubExam[]> = {};
    subExams.forEach((subExam) => {
      const type = subExam.examType || 'other';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(subExam);
    });
    // Sort groups by exam type order
    const typeOrder: Record<string, number> = {
      quiz: 1,
      assignment: 2,
      mid_exam: 3,
      general_test: 4,
      other: 5,
    };
    const sortedGroups: Record<string, SubExam[]> = {};
    Object.keys(groups)
      .sort((a, b) => (typeOrder[a] || 99) - (typeOrder[b] || 99))
      .forEach((key) => {
        sortedGroups[key] = groups[key].sort((a, b) => a.name.localeCompare(b.name));
      });
    return sortedGroups;
  }, [subExams]);

  // Get exam type display name and icon
  const getExamTypeInfo = (type: string) => {
    const info: Record<string, { name: string; icon: any; color: string }> = {
      quiz: { name: 'Quiz', icon: ClipboardList, color: 'text-blue-600' },
      assignment: { name: 'Assignment', icon: FileText, color: 'text-purple-600' },
      mid_exam: { name: 'Mid Exam', icon: BookOpen, color: 'text-orange-600' },
      general_test: { name: 'General Test', icon: GraduationCap, color: 'text-green-600' },
      other: { name: 'Other', icon: FileText, color: 'text-gray-600' },
    };
    return info[type] || info.other;
  };

  // Calculate total weight for an exam type group
  const getTotalWeight = (subExams: SubExam[]) => {
    return subExams.reduce((sum, se) => sum + se.weightPercent, 0);
  };

  // Auto-save function with debounce
  const debouncedSave = useDebouncedCallback(
    async (studentId: string, subExamId: string, score: number, maxScore: number) => {
      const key = `${studentId}-${subExamId}`;
      if (pendingSavesRef.current.has(key)) return;
      
      // Check if value has changed
      const savedValue = savedMarks[studentId]?.[subExamId];
      if (savedValue === score) {
        setSaveStatus((prev) => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [subExamId]: 'saved',
          },
        }));
        return;
      }

      // Validate score
      if (score < 0 || score > maxScore) {
        setSaveStatus((prev) => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [subExamId]: 'unsaved',
          },
        }));
        return;
      }

      pendingSavesRef.current.add(key);
      setSaveStatus((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [subExamId]: 'saving',
        },
      }));

      try {
        await recordMark.mutateAsync({
          studentId,
          subExamId,
          termId,
          data: { score, notes: '' },
        });
        
        // Update saved marks
        setSavedMarks((prev) => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [subExamId]: score,
          },
        }));
        
        setSaveStatus((prev) => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [subExamId]: 'saved',
          },
        }));
      } catch (error) {
        setSaveStatus((prev) => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [subExamId]: 'unsaved',
          },
        }));
      } finally {
        pendingSavesRef.current.delete(key);
      }
    },
    2000 // 2 second delay
  );

  const handleScoreChange = (studentId: string, subExamId: string, score: number, maxScore: number) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subExamId]: score,
      },
    }));
    
    // Mark as unsaved
    setSaveStatus((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subExamId]: 'unsaved',
      },
    }));
    
    // Trigger debounced auto-save
    debouncedSave(studentId, subExamId, score, maxScore);
  };

  // Calculate student total and average
  const calculateStudentStats = (studentId: string) => {
    let totalScore = 0;
    let totalMaxScore = 0;
    let count = 0;
    
    subExams.forEach((subExam) => {
      const score = marks[studentId]?.[subExam.id] ?? savedMarks[studentId]?.[subExam.id] ?? 0;
      if (score > 0 || savedMarks[studentId]?.[subExam.id] !== undefined) {
        totalScore += score;
        totalMaxScore += subExam.maxScore;
        count++;
      }
    });
    
    const average = count > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    return { total: totalScore, maxTotal: totalMaxScore, average, count };
  };

  // Calculate class statistics for a sub-exam
  const calculateClassStats = (subExamId: string) => {
    const scores = sortedStudents
      .map((student) => marks[student.id]?.[subExamId] ?? savedMarks[student.id]?.[subExamId])
      .filter((score): score is number => score !== undefined && score !== null);
    
    if (scores.length === 0) {
      return { average: 0, highest: 0, lowest: 0, completed: 0, total: sortedStudents.length };
    }
    
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = sum / scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    
    return {
      average: Number(average.toFixed(2)),
      highest,
      lowest,
      completed: scores.length,
      total: sortedStudents.length,
    };
  };

  // Handle Save All
  const handleSaveAll = async () => {
    const allSubExams = subExams;
    const savePromises: Promise<void>[] = [];
    
    sortedStudents.forEach((student) => {
      allSubExams.forEach((subExam) => {
        const score = marks[student.id]?.[subExam.id];
        const savedValue = savedMarks[student.id]?.[subExam.id];
        
        if (score !== undefined && score !== savedValue && score >= 0 && score <= subExam.maxScore) {
          const key = `${student.id}-${subExam.id}`;
          if (!pendingSavesRef.current.has(key)) {
            pendingSavesRef.current.add(key);
            setSaveStatus((prev) => ({
              ...prev,
              [student.id]: {
                ...prev[student.id],
                [subExam.id]: 'saving',
              },
            }));
            
            savePromises.push(
              recordMark
                .mutateAsync({
                  studentId: student.id,
                  subExamId: subExam.id,
                  termId,
                  data: { score, notes: '' },
                })
                .then(() => {
                  setSavedMarks((prev) => ({
                    ...prev,
                    [student.id]: {
                      ...prev[student.id],
                      [subExam.id]: score,
                    },
                  }));
                  setSaveStatus((prev) => ({
                    ...prev,
                    [student.id]: {
                      ...prev[student.id],
                      [subExam.id]: 'saved',
                    },
                  }));
                })
                .catch(() => {
                  setSaveStatus((prev) => ({
                    ...prev,
                    [student.id]: {
                      ...prev[student.id],
                      [subExam.id]: 'unsaved',
                    },
                  }));
                })
                .finally(() => {
                  pendingSavesRef.current.delete(key);
                })
            );
          }
        }
      });
    });
    
    await Promise.all(savePromises);
  };

  // Calculate overall completion status
  const completionStats = useMemo(() => {
    let totalMarks = 0;
    let completedMarks = 0;
    
    sortedStudents.forEach((student) => {
      subExams.forEach((subExam) => {
        totalMarks++;
        const score = marks[student.id]?.[subExam.id] ?? savedMarks[student.id]?.[subExam.id];
        if (score !== undefined && score !== null) {
          completedMarks++;
        }
      });
    });
    
    return {
      completed: completedMarks,
      total: totalMarks,
      percentage: totalMarks > 0 ? Math.round((completedMarks / totalMarks) * 100) : 0,
    };
  }, [sortedStudents, subExams, marks, savedMarks]);

  if (!classData?.data || !subject || !term) {
    return <LoadingState rows={10} columns={5} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton href="/dashboard/results" />
          <div>
            <h1 className="text-xl font-semibold">Continuous Results</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {classData.data.name} - {subject.name} - {term.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Export to CSV
              const headers = ['No', 'Student Name', ...subExams.map(se => se.name), 'Total', 'Average (%)'];
              const rows = sortedStudents.map((student, index) => {
                const studentStats = calculateStudentStats(student.id);
                const row = [
                  index + 1,
                  formatFullName(student.firstName, student.lastName),
                  ...subExams.map(subExam => {
                    const score = marks[student.id]?.[subExam.id] ?? savedMarks[student.id]?.[subExam.id] ?? 0;
                    return score.toFixed(2);
                  }),
                  studentStats.total.toFixed(2),
                  studentStats.average > 0 ? studentStats.average.toFixed(2) : '-'
                ];
                return row;
              });
              
              const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', `continuous-results-${classData.data.name}-${subject.name}-${term.name}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Print
              const printWindow = window.open('', '_blank');
              if (!printWindow) return;
              
              const tableRows = sortedStudents.map((student, index) => {
                const studentStats = calculateStudentStats(student.id);
                const studentName = formatFullName(student.firstName, student.lastName);
                const subExamCells = subExams.map(subExam => {
                  const score = marks[student.id]?.[subExam.id] ?? savedMarks[student.id]?.[subExam.id] ?? 0;
                  return `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${score.toFixed(2)}</td>`;
                }).join('');
                
                return `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${studentName}</td>
                    ${subExamCells}
                    <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${studentStats.total.toFixed(2)}</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${studentStats.average > 0 ? studentStats.average.toFixed(2) + '%' : '-'}</td>
                  </tr>
                `;
              }).join('');
              
              const subExamHeaders = subExams.map(se => `<th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">${se.name}</th>`).join('');
              
              const htmlContent = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Continuous Results - ${classData.data.name} - ${subject.name} - ${term.name}</title>
                    <style>
                      @media print {
                        .no-print { display: none; }
                        body { margin: 0; padding: 20px; }
                      }
                      body { font-family: Arial, sans-serif; }
                      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                      th, td { border: 1px solid #e5e7eb; }
                      .header { margin-bottom: 20px; }
                      .header h1 { margin: 0; font-size: 24px; }
                      .header p { margin: 5px 0; color: #6b7280; }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <h1>Continuous Results</h1>
                      <p><strong>Class:</strong> ${classData.data.name}</p>
                      <p><strong>Subject:</strong> ${subject.name}</p>
                      <p><strong>Term:</strong> ${term.name}</p>
                      <p><strong>Date:</strong> ${format(new Date(), 'MMMM dd, yyyy')}</p>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">No</th>
                          <th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold;">Student Name</th>
                          ${subExamHeaders}
                          <th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">Total</th>
                          <th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">Average (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${tableRows}
                      </tbody>
                    </table>
                  </body>
                </html>
              `;
              
              printWindow.document.write(htmlContent);
              printWindow.document.close();
              printWindow.focus();
              setTimeout(() => {
                printWindow.print();
              }, 250);
            }}
            className="text-xs"
          >
            <Printer className="h-3 w-3 mr-1" />
            Print
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={recordMark.isPending || recordBulkMarks.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="mr-2 h-4 w-4" />
            Save All
          </Button>
        </div>
      </div>

      {/* Marks Entry Table - Flat List */}
      <Card>
        <CardHeader>
          <CardTitle>Student Results</CardTitle>
          <CardDescription>
            Enter results for all students. Results are auto-saved 2 seconds after you stop typing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subExams.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No sub-exams found for this subject.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please create sub-exams before entering results.
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-16 sticky left-0 bg-slate-50 z-20">NO</TableHead>
                    <TableHead className="min-w-[200px] sticky left-16 bg-slate-50 z-20 border-r">
                      Student
                    </TableHead>
                    {subExams.map((subExam) => {
                      const classStats = calculateClassStats(subExam.id);
                      const typeInfo = getExamTypeInfo(subExam.examType);
                      return (
                        <TableHead key={subExam.id} className="min-w-[160px] text-center">
                          <div className="space-y-1.5 py-2">
                            <div className="font-semibold text-sm">{subExam.name}</div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <div>Max: {subExam.maxScore} pts</div>
                              <div className="text-[10px] capitalize text-muted-foreground/80">
                                {typeInfo.name}
                              </div>
                            </div>
                            <div className="text-xs pt-1 border-t mt-1">
                              <div className="text-muted-foreground text-[10px]">
                                {classStats.completed}/{classStats.total} entered
                              </div>
                            </div>
                          </div>
                        </TableHead>
                      );
                    })}
                    <TableHead className="min-w-[120px] text-center bg-slate-50 sticky right-0">
                      <div className="space-y-1.5 py-2">
                        <div className="font-semibold">Total</div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[120px] text-center bg-slate-50 sticky right-[120px]">
                      <div className="space-y-1.5 py-2">
                        <div className="font-semibold">Average</div>
                        <div className="text-xs text-muted-foreground">%</div>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={subExams.length + 4}
                        className="text-center py-12 text-gray-500 text-sm"
                      >
                        No students found in this class
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedStudents.map((student, index) => {
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
                      const studentStats = calculateStudentStats(student.id);
                      const studentInitials = getInitials(student.firstName, student.lastName);
                      
                      return (
                        <TableRow key={student.id} className="hover:bg-slate-50/50">
                          <TableCell className="text-center font-medium sticky left-0 bg-background z-10">
                            {index + 1}
                          </TableCell>
                          <TableCell className="sticky left-16 bg-background z-10 border-r">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-semibold text-blue-700">
                                  {studentInitials}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm truncate">
                                  {formatFullName(student.firstName, student.lastName)}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate">
                                  {className}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          {subExams.map((subExam) => {
                            const currentScore =
                              marks[student.id]?.[subExam.id] ??
                              savedMarks[student.id]?.[subExam.id] ??
                              0;
                            const status = saveStatus[student.id]?.[subExam.id] || 'saved';
                            const isInvalid = currentScore > subExam.maxScore || currentScore < 0;
                            const percentage = subExam.maxScore > 0 
                              ? (currentScore / subExam.maxScore) * 100 
                              : 0;
                            
                            return (
                              <TableCell key={subExam.id}>
                                <div className="space-y-1">
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      min="0"
                                      max={subExam.maxScore}
                                      step="0.01"
                                      value={currentScore || ''}
                                      onChange={(e) =>
                                        handleScoreChange(
                                          student.id,
                                          subExam.id,
                                          parseFloat(e.target.value) || 0,
                                          subExam.maxScore
                                        )
                                      }
                                      className={cn(
                                        "w-full text-center font-medium",
                                        status === 'saved' && !isInvalid && "border-green-300 bg-green-50/50",
                                        status === 'saving' && "border-yellow-300 bg-yellow-50/50",
                                        status === 'unsaved' && !isInvalid && "border-orange-300 bg-orange-50/50",
                                        isInvalid && "border-red-300 bg-red-50/50"
                                      )}
                                    />
                                    {status === 'saving' && (
                                      <div className="absolute -top-1 -right-1">
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent" />
                                      </div>
                                    )}
                                    {status === 'saved' && !isInvalid && (
                                      <div className="absolute -top-1 -right-1">
                                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                                      </div>
                                    )}
                                    {isInvalid && (
                                      <div className="absolute -top-1 -right-1">
                                        <AlertCircle className="h-3 w-3 text-red-600" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-center text-muted-foreground">
                                    {percentage.toFixed(1)}%
                                  </div>
                                </div>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-semibold bg-slate-50/50 sticky right-0">
                            <div className="space-y-1">
                              <div className="text-base">{studentStats.total.toFixed(1)}</div>
                              <div className="text-xs text-muted-foreground">
                                / {studentStats.maxTotal.toFixed(1)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold bg-slate-50/50 sticky right-[120px]">
                            <div className="space-y-1">
                              <div className={cn(
                                "text-lg font-bold",
                                studentStats.average >= 80 && "text-green-600",
                                studentStats.average >= 60 && studentStats.average < 80 && "text-yellow-600",
                                studentStats.average < 60 && studentStats.average > 0 && "text-red-600"
                              )}>
                                {studentStats.average > 0 ? `${studentStats.average.toFixed(1)}%` : '-'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {studentStats.count} exams
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
