'use client';

import { BackButton } from '@/components/shared/BackButton';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClass, useClassSubjects } from '@/lib/hooks/use-classes';
import { useRecordBulkResults, useRecordResult, useResultsByClassAndTerm } from '@/lib/hooks/use-results';
import { useStudents } from '@/lib/hooks/use-students';
import { useSubExams } from '@/lib/hooks/use-subexams';
import { useTerms } from '@/lib/hooks/use-terms';
import { SubExam } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from '@/lib/utils/debounce';
import { formatFullName, getInitials } from '@/lib/utils/format';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Download, Loader2, Printer, Save } from 'lucide-react';
import { use, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export default function ContinuousResultsPage({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string; termId: string }>;
}) {
  const { classId, subjectId, termId } = use(params);
  const { data: classData } = useClass(classId);
  const { data: subjectsData } = useClassSubjects(classId);
  const { data: termsData } = useTerms();

  // Get subject and term early for loading check
  const subject = subjectsData?.data?.find((s) => s.id === subjectId);
  const term = termsData?.data?.find((t) => t.id === termId);

  // Get gradeId from class
  const gradeId = classData?.data?.gradeId || '';
  const { data: subExamsData, isLoading: subExamsLoading } = useSubExams(gradeId, subjectId);
  const [page, setPage] = useState(1);
  const [limit] = useState(40);
  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    classId,
    classStatus: 'assigned',
    page,
    limit
  });
  const { data: marksData, isLoading: marksLoading, refetch: refetchMarks } = useResultsByClassAndTerm(classId, subjectId, termId);


  const recordBulkMarks = useRecordBulkResults();
  const recordMark = useRecordResult({ silent: true }); // Silent mode for auto-save
  const [marks, setMarks] = useState<Record<string, Record<string, number>>>({});

  // Save status tracking: 'saved' | 'saving' | 'unsaved'
  const [saveStatus, setSaveStatus] = useState<Record<string, Record<string, 'saved' | 'saving' | 'unsaved'>>>({});

  // Track which marks have been saved (from database)
  const [savedMarks, setSavedMarks] = useState<Record<string, Record<string, number>>>({});

  // Track pending saves to prevent duplicate saves
  const pendingSavesRef = useRef<Set<string>>(new Set());

  // Batch collection for auto-save - groups by subExamId
  const pendingBatchRef = useRef<Map<string, {
    studentId: string;
    subExamId: string;
    score: number;
    maxScore: number;
  }>>(new Map());

  // Track if marks have been initialized to prevent clearing after user edits
  const marksInitializedRef = useRef(false);

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
    // Only initialize when marks data is loaded and available
    if (marksLoading) return;

    if (existingMarks && existingMarks.length > 0) {
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

      // Only update if data has actually changed (prevent unnecessary re-renders)
      setMarks((prev) => {
        const prevKey = JSON.stringify(prev);
        const newKey = JSON.stringify(initialMarks);
        return prevKey !== newKey ? initialMarks : prev;
      });

      setSavedMarks((prev) => {
        const prevKey = JSON.stringify(prev);
        const newKey = JSON.stringify(initialSaved);
        return prevKey !== newKey ? initialSaved : prev;
      });

      setSaveStatus((prev) => {
        const prevKey = JSON.stringify(prev);
        const newKey = JSON.stringify(initialStatus);
        return prevKey !== newKey ? initialStatus : prev;
      });

      marksInitializedRef.current = true;
    } else if (existingMarks && existingMarks.length === 0 && !marksInitializedRef.current) {
      // Only clear on initial load when there's no data and we haven't initialized yet
      setMarks({});
      setSavedMarks({});
      setSaveStatus({});
      marksInitializedRef.current = true;
    }
  }, [existingMarks, marksLoading]);

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

  // Get ordered sub-exams by type: quizzes, assignments, mid_exam, general_test
  const orderedSubExams = useMemo(() => {
    const quizzes = subExams.filter(se => se.examType === 'quiz').sort((a, b) => a.name.localeCompare(b.name));
    const assignments = subExams.filter(se => se.examType === 'assignment').sort((a, b) => a.name.localeCompare(b.name));
    const midExams = subExams.filter(se => se.examType === 'mid_exam').sort((a, b) => a.name.localeCompare(b.name));
    const generalTests = subExams.filter(se => se.examType === 'general_test').sort((a, b) => a.name.localeCompare(b.name));

    return {
      quizzes,
      assignments,
      midExams,
      generalTests,
      all: [...quizzes, ...assignments, ...midExams, ...generalTests]
    };
  }, [subExams]);

  // Calculate subtotals for a student
  const calculateStudentSubtotals = (studentId: string) => {
    const getScore = (subExamId: string) =>
      marks[studentId]?.[subExamId] ?? savedMarks[studentId]?.[subExamId] ?? 0;

    // Quizzes total
    const quizzesTotal = orderedSubExams.quizzes.reduce((sum, se) => {
      const score = getScore(se.id);
      return sum + (score || 0);
    }, 0);
    const quizzesMax = orderedSubExams.quizzes.reduce((sum, se) => sum + se.maxScore, 0);

    // Assignments total
    const assignmentsTotal = orderedSubExams.assignments.reduce((sum, se) => {
      const score = getScore(se.id);
      return sum + (score || 0);
    }, 0);
    const assignmentsMax = orderedSubExams.assignments.reduce((sum, se) => sum + se.maxScore, 0);

    // Mid Exams total
    const midExamsTotal = orderedSubExams.midExams.reduce((sum, se) => {
      const score = getScore(se.id);
      return sum + (score || 0);
    }, 0);
    const midExamsMax = orderedSubExams.midExams.reduce((sum, se) => sum + se.maxScore, 0);

    // Sub-total (quizzes + assignments + mid exams) - should be 60
    const subTotal = quizzesTotal + assignmentsTotal + midExamsTotal;
    const subTotalMax = quizzesMax + assignmentsMax + midExamsMax;

    // General Test total - should be 40
    const generalTestTotal = orderedSubExams.generalTests.reduce((sum, se) => {
      const score = getScore(se.id);
      return sum + (score || 0);
    }, 0);
    const generalTestMax = orderedSubExams.generalTests.reduce((sum, se) => sum + se.maxScore, 0);

    // Grand Total - should be 100
    const grandTotal = subTotal + generalTestTotal;
    const grandTotalMax = subTotalMax + generalTestMax;

    return {
      quizzes: { total: quizzesTotal, max: quizzesMax },
      assignments: { total: assignmentsTotal, max: assignmentsMax },
      midExams: { total: midExamsTotal, max: midExamsMax },
      subTotal: { total: subTotal, max: subTotalMax },
      generalTest: { total: generalTestTotal, max: generalTestMax },
      grandTotal: { total: grandTotal, max: grandTotalMax }
    };
  };

  // Add to batch for auto-save
  const addToBatch = (studentId: string, subExamId: string, score: number, maxScore: number) => {
    const key = `${studentId}-${subExamId}`;

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

    // Validate score - clamp to valid range
    if (score < 0) {
      score = 0;
    }
    if (score > maxScore) {
      score = maxScore;
    }

    // Add to batch
    pendingBatchRef.current.set(key, { studentId, subExamId, score, maxScore });

    // Mark as saving
    setSaveStatus((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subExamId]: 'saving',
      },
    }));
  };

  // Batch save function - groups by subExamId and uses bulk endpoint when possible
  const debouncedBatchSave = useDebouncedCallback(
    async () => {
      if (pendingBatchRef.current.size === 0) return;

      const batch = Array.from(pendingBatchRef.current.values());
      pendingBatchRef.current.clear();

      // Group by subExamId for bulk saves
      const marksBySubExam = new Map<string, Array<{ studentId: string; score: number; notes?: string }>>();
      const individualSaves: Array<{ studentId: string; subExamId: string; score: number; maxScore: number }> = [];

      batch.forEach(({ studentId, subExamId, score, maxScore }) => {
        const key = `${studentId}-${subExamId}`;
        if (pendingSavesRef.current.has(key)) {
          individualSaves.push({ studentId, subExamId, score, maxScore });
          return;
        }

        if (!marksBySubExam.has(subExamId)) {
          marksBySubExam.set(subExamId, []);
        }
        marksBySubExam.get(subExamId)!.push({ studentId, score, notes: '' });
        pendingSavesRef.current.add(key);
      });

      const savePromises: Promise<void>[] = [];

      // Use bulk endpoint for groups with multiple marks
      marksBySubExam.forEach((marksData, subExamId) => {
        if (marksData.length > 1) {
          // Bulk save
          savePromises.push(
            recordBulkMarks
              .mutateAsync({
                subExamId,
                termId,
                marksData,
              })
              .then((results) => {
                // Update saved marks and status for successful saves
                marksData.forEach(({ studentId, score }, index) => {
                  const result = Array.isArray(results) ? results[index] : results;
                  if (result && result.success === true) {
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
                  } else {
                    setSaveStatus((prev) => ({
                      ...prev,
                      [studentId]: {
                        ...prev[studentId],
                        [subExamId]: 'unsaved',
                      },
                    }));
                  }
                  pendingSavesRef.current.delete(`${studentId}-${subExamId}`);
                });
              })
              .catch(() => {
                // Mark all as unsaved on error
                marksData.forEach(({ studentId }) => {
                  setSaveStatus((prev) => ({
                    ...prev,
                    [studentId]: {
                      ...prev[studentId],
                      [subExamId]: 'unsaved',
                    },
                  }));
                  pendingSavesRef.current.delete(`${studentId}-${subExamId}`);
                });
              })
          );
        } else {
          // Single save - use individual endpoint
          const { studentId, score } = marksData[0];
          savePromises.push(
            recordMark
              .mutateAsync({
                studentId,
                subExamId,
                termId,
                data: { score, notes: '' },
              })
              .then(() => {
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
                pendingSavesRef.current.delete(`${studentId}-${subExamId}`);
              })
              .catch(() => {
                setSaveStatus((prev) => ({
                  ...prev,
                  [studentId]: {
                    ...prev[studentId],
                    [subExamId]: 'unsaved',
                  },
                }));
                pendingSavesRef.current.delete(`${studentId}-${subExamId}`);
              })
          );
        }
      });

      // Handle individual saves that were already pending
      individualSaves.forEach(({ studentId, subExamId, score }) => {
        const key = `${studentId}-${subExamId}`;
        if (!pendingSavesRef.current.has(key)) {
          pendingSavesRef.current.add(key);
          savePromises.push(
            recordMark
              .mutateAsync({
                studentId,
                subExamId,
                termId,
                data: { score, notes: '' },
              })
              .then(() => {
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
                pendingSavesRef.current.delete(key);
              })
              .catch(() => {
                setSaveStatus((prev) => ({
                  ...prev,
                  [studentId]: {
                    ...prev[studentId],
                    [subExamId]: 'unsaved',
                  },
                }));
                pendingSavesRef.current.delete(key);
              })
          );
        }
      });

      await Promise.allSettled(savePromises);

      // Refetch marks data to ensure UI is in sync with saved data
      setTimeout(() => {
        refetchMarks();
      }, 500); // Small delay to ensure backend has processed
    },
    2500 // 2.5 second delay
  );

  const handleScoreChange = (studentId: string, subExamId: string, score: number, maxScore: number) => {
    // Check if value exceeds max BEFORE processing
    if (score > maxScore) {
      // Show toast warning
      toast.error("Value Exceeds Maximum", {
        description: `Maximum allowed score is ${maxScore} points.`,
        duration: 3000,
      });
      // Clear the value (set to 0)
      setMarks((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [subExamId]: 0,
        },
      }));
      // Update saved marks to reflect cleared value
      setSavedMarks((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [subExamId]: 0,
        },
      }));
      setSaveStatus((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [subExamId]: 'unsaved',
        },
      }));
      return; // Don't proceed with save
    }

    // Normal validation (clamp to 0 if negative)
    if (score < 0) {
      score = 0;
    }

    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subExamId]: score,
      },
    }));

    // Add to batch and trigger debounced batch save
    addToBatch(studentId, subExamId, score, maxScore);
    debouncedBatchSave();
  };

  // Calculate student total (for backward compatibility)
  const calculateStudentStats = (studentId: string) => {
    const subtotals = calculateStudentSubtotals(studentId);
    return {
      total: subtotals.grandTotal.total,
      maxTotal: subtotals.grandTotal.max,
      count: orderedSubExams.all.length
    };
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

  // Handle Save All - uses bulk endpoint grouped by subExamId
  const handleSaveAll = async () => {
    // Collect all unsaved marks
    const unsavedMarks: Array<{
      studentId: string;
      subExamId: string;
      score: number;
      maxScore: number;
    }> = [];

    sortedStudents.forEach((student) => {
      orderedSubExams.all.forEach((subExam) => {
        const score = marks[student.id]?.[subExam.id];
        const savedValue = savedMarks[student.id]?.[subExam.id];

        if (score !== undefined && score !== savedValue && score >= 0 && score <= subExam.maxScore) {
          unsavedMarks.push({
            studentId: student.id,
            subExamId: subExam.id,
            score,
            maxScore: subExam.maxScore,
          });
        }
      });
    });

    if (unsavedMarks.length === 0) {
      toast.info("All results are already saved");
      return;
    }

    // Group by subExamId for bulk saves
    const marksBySubExam = new Map<string, Array<{ studentId: string; score: number; notes?: string }>>();

    unsavedMarks.forEach(({ studentId, subExamId, score }) => {
      const key = `${studentId}-${subExamId}`;
      if (pendingSavesRef.current.has(key)) return;

      if (!marksBySubExam.has(subExamId)) {
        marksBySubExam.set(subExamId, []);
      }
      marksBySubExam.get(subExamId)!.push({ studentId, score, notes: '' });
      pendingSavesRef.current.add(key);

      // Mark as saving
      setSaveStatus((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [subExamId]: 'saving',
        },
      }));
    });

    // Use bulk endpoint for each subExamId group
    const savePromises = Array.from(marksBySubExam.entries()).map(([subExamId, marksData]) =>
      recordBulkMarks
        .mutateAsync({
          subExamId,
          termId,
          marksData,
        })
        .then((results) => {
          // Update saved marks and status for successful saves
          marksData.forEach(({ studentId, score }, index) => {
            const key = `${studentId}-${subExamId}`;
            const result = Array.isArray(results) ? results[index] : results;

            if (result && result.success === true) {
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
            } else {
              setSaveStatus((prev) => ({
                ...prev,
                [studentId]: {
                  ...prev[studentId],
                  [subExamId]: 'unsaved',
                },
              }));
            }
            pendingSavesRef.current.delete(key);
          });
        })
        .catch((error) => {
          // Mark all as unsaved on error
          marksData.forEach(({ studentId }) => {
            const key = `${studentId}-${subExamId}`;
            setSaveStatus((prev) => ({
              ...prev,
              [studentId]: {
                ...prev[studentId],
                [subExamId]: 'unsaved',
              },
            }));
            pendingSavesRef.current.delete(key);
          });
          throw error;
        })
    );

    try {
      const results = await Promise.allSettled(savePromises);
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;
      const totalSaved = unsavedMarks.length;

      // Refetch marks data to ensure UI shows saved data
      // Use a small delay to ensure backend has processed all saves
      setTimeout(() => {
        refetchMarks();
      }, 300);

      if (failed === 0) {
        toast.success("All Results Saved", {
          description: `Successfully saved ${totalSaved} result${totalSaved !== 1 ? 's' : ''}.`,
          duration: 3000,
        });
      } else {
        toast.warning("Some Results Failed to Save", {
          description: `Saved ${successful} out of ${totalSaved} results. Please check and retry failed saves.`,
          duration: 5000,
        });
      }
    } catch (error) {
      toast.error("Save All Failed", {
        description: "Failed to save results. Please try again.",
        duration: 5000,
      });
    }
  };

  // Calculate overall completion status
  const completionStats = useMemo(() => {
    let totalMarks = 0;
    let completedMarks = 0;

    sortedStudents.forEach((student) => {
      orderedSubExams.all.forEach((subExam) => {
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
  }, [sortedStudents, orderedSubExams.all, marks, savedMarks]);

  if (!classData?.data || !subject || !term) {
    return <ErrorState message="Failed to load class, subject, or term data." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackButton href="/dashboard/results" />
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">Continuous Results</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {classData.data.name} - {subject.name} - {term.name}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Export to CSV
              const headers = [
                'No',
                'Student Name',
                ...orderedSubExams.quizzes.map(se => se.name),
                ...orderedSubExams.assignments.map(se => se.name),
                ...orderedSubExams.midExams.map(se => se.name),
                'Sub-Total (Quizzes+Assignments+Mid)',
                ...orderedSubExams.generalTests.map(se => se.name),
                'Grand Total'
              ];
              const rows = sortedStudents.map((student, index) => {
                const subtotals = calculateStudentSubtotals(student.id);
                const getScore = (subExamId: string) =>
                  marks[student.id]?.[subExamId] ?? savedMarks[student.id]?.[subExamId] ?? 0;
                const row = [
                  index + 1,
                  formatFullName(student.firstName, student.lastName),
                  ...orderedSubExams.quizzes.map(se => getScore(se.id).toFixed(2)),
                  ...orderedSubExams.assignments.map(se => getScore(se.id).toFixed(2)),
                  ...orderedSubExams.midExams.map(se => getScore(se.id).toFixed(2)),
                  subtotals.subTotal.total.toFixed(2),
                  ...orderedSubExams.generalTests.map(se => getScore(se.id).toFixed(2)),
                  subtotals.grandTotal.total.toFixed(2)
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

              const getScore = (studentId: string, subExamId: string) =>
                marks[studentId]?.[subExamId] ?? savedMarks[studentId]?.[subExamId] ?? 0;

              const tableRows = sortedStudents.map((student, index) => {
                const subtotals = calculateStudentSubtotals(student.id);
                const studentName = formatFullName(student.firstName, student.lastName);
                const quizCells = orderedSubExams.quizzes.map(se =>
                  `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${getScore(student.id, se.id).toFixed(2)}</td>`
                ).join('');
                const assignmentCells = orderedSubExams.assignments.map(se =>
                  `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${getScore(student.id, se.id).toFixed(2)}</td>`
                ).join('');
                const midExamCells = orderedSubExams.midExams.map(se =>
                  `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${getScore(student.id, se.id).toFixed(2)}</td>`
                ).join('');
                const generalTestCells = orderedSubExams.generalTests.map(se =>
                  `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${getScore(student.id, se.id).toFixed(2)}</td>`
                ).join('');

                return `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${studentName}</td>
                    ${quizCells}
                    ${assignmentCells}
                    ${midExamCells}
                    <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold; background-color: #dbeafe;">${subtotals.subTotal.total.toFixed(2)} / 60</td>
                    ${generalTestCells}
                    <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold; background-color: #dcfce7;">${subtotals.grandTotal.total.toFixed(2)} / 100</td>
                  </tr>
                `;
              }).join('');

              const quizHeaders = orderedSubExams.quizzes.map(se =>
                `<th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">${se.name}</th>`
              ).join('');
              const assignmentHeaders = orderedSubExams.assignments.map(se =>
                `<th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">${se.name}</th>`
              ).join('');
              const midExamHeaders = orderedSubExams.midExams.map(se =>
                `<th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">${se.name}</th>`
              ).join('');
              const generalTestHeaders = orderedSubExams.generalTests.map(se =>
                `<th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">${se.name}</th>`
              ).join('');
              const subExamHeaders = quizHeaders + assignmentHeaders + midExamHeaders +
                `<th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #dbeafe; font-weight: bold; text-align: center;">Sub-Total / 60</th>` +
                generalTestHeaders;

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
                          <th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #dcfce7; font-weight: bold; text-align: center;">Grand Total / 100</th>
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
          {subExamsLoading || studentsLoading || marksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-3 text-sm text-muted-foreground">Loading results...</span>
            </div>
          ) : orderedSubExams.all.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No sub-exams found for this subject.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please create sub-exams before entering results.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-12 sticky left-0 bg-slate-50 z-20 text-center">NO</TableHead>
                        <TableHead className="w-[140px] sticky left-12 bg-slate-50 z-20 border-r">
                          Student
                        </TableHead>
                        {/* Quizzes */}
                        {orderedSubExams.quizzes.map((subExam) => {
                          const classStats = calculateClassStats(subExam.id);
                          return (
                            <TableHead key={subExam.id} className="w-[90px] text-center border-l">
                              <div className="space-y-0.5 py-1">
                                <div className="font-semibold text-xs leading-tight">{subExam.name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  Max: {subExam.maxScore}
                                </div>
                              </div>
                            </TableHead>
                          );
                        })}
                        {/* Assignments */}
                        {orderedSubExams.assignments.map((subExam) => {
                          const classStats = calculateClassStats(subExam.id);
                          return (
                            <TableHead key={subExam.id} className="w-[90px] text-center border-l">
                              <div className="space-y-0.5 py-1">
                                <div className="font-semibold text-xs leading-tight">{subExam.name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  Max: {subExam.maxScore}
                                </div>
                              </div>
                            </TableHead>
                          );
                        })}
                        {/* Mid Exams */}
                        {orderedSubExams.midExams.map((subExam) => {
                          const classStats = calculateClassStats(subExam.id);
                          return (
                            <TableHead key={subExam.id} className="w-[90px] text-center border-l">
                              <div className="space-y-0.5 py-1">
                                <div className="font-semibold text-xs leading-tight">{subExam.name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  Max: {subExam.maxScore}
                                </div>
                              </div>
                            </TableHead>
                          );
                        })}
                        {/* Sub-total (Quizzes + Assignments + Mid Exams) */}
                        <TableHead className="w-[90px] text-center bg-blue-50/50 border-l-2 border-blue-300">
                          <div className="space-y-0.5 py-1">
                            <div className="font-semibold text-xs">Sub-Total</div>
                            <div className="text-[10px] text-muted-foreground">/ 60</div>
                          </div>
                        </TableHead>
                        {/* General Test */}
                        {orderedSubExams.generalTests.map((subExam) => {
                          const classStats = calculateClassStats(subExam.id);
                          return (
                            <TableHead key={subExam.id} className="w-[90px] text-center border-l">
                              <div className="space-y-0.5 py-1">
                                <div className="font-semibold text-xs leading-tight">{subExam.name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  Max: {subExam.maxScore}
                                </div>
                              </div>
                            </TableHead>
                          );
                        })}
                        {/* Grand Total */}
                        <TableHead className="w-[90px] text-center bg-green-50/50 sticky right-0 border-l-2 border-green-300">
                          <div className="space-y-0.5 py-1">
                            <div className="font-semibold text-xs">Total</div>
                            <div className="text-[10px] text-muted-foreground">/ 100</div>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedStudents.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={orderedSubExams.all.length + 4}
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
                          const subtotals = calculateStudentSubtotals(student.id);
                          const studentInitials = getInitials(student.firstName, student.lastName);

                          const renderSubExamCell = (subExam: SubExam) => {
                            const currentScore =
                              marks[student.id]?.[subExam.id] ??
                              savedMarks[student.id]?.[subExam.id] ??
                              0;
                            const status = saveStatus[student.id]?.[subExam.id] || 'saved';
                            const isInvalid = currentScore > subExam.maxScore || currentScore < 0;
                            return (
                              <TableCell key={subExam.id} className="p-1 border-l">
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={subExam.maxScore}
                                    step="0.01"
                                    value={currentScore || ''}
                                    onChange={(e) => {
                                      const rawValue = e.target.value;
                                      // Allow empty string for clearing
                                      if (rawValue === '') {
                                        handleScoreChange(student.id, subExam.id, 0, subExam.maxScore);
                                        return;
                                      }
                                      const value = parseFloat(rawValue) || 0;
                                      handleScoreChange(student.id, subExam.id, value, subExam.maxScore);
                                    }}
                                    className={cn(
                                      "w-full text-center font-medium text-xs h-8 px-1",
                                      status === 'saved' && !isInvalid && "border-green-300 bg-green-50/50",
                                      status === 'saving' && "border-yellow-300 bg-yellow-50/50",
                                      status === 'unsaved' && !isInvalid && "border-orange-300 bg-orange-50/50",
                                      isInvalid && "border-red-300 bg-red-50/50"
                                    )}
                                  />
                                  {status === 'saving' && (
                                    <div className="absolute -top-0.5 -right-0.5">
                                      <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent" />
                                    </div>
                                  )}
                                  {status === 'saved' && !isInvalid && (
                                    <div className="absolute -top-0.5 -right-0.5">
                                      <CheckCircle2 className="h-2.5 w-2.5 text-green-600" />
                                    </div>
                                  )}
                                  {isInvalid && (
                                    <div className="absolute -top-0.5 -right-0.5">
                                      <AlertCircle className="h-2.5 w-2.5 text-red-600" />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            );
                          };

                          return (
                            <TableRow key={student.id} className="hover:bg-slate-50/50">
                              <TableCell className="text-center font-medium sticky left-0 bg-background z-10 text-xs">
                                {(page - 1) * limit + index + 1}
                              </TableCell>
                              <TableCell className="sticky left-12 bg-background z-10 border-r">
                                <div className="flex items-center gap-2">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-xs font-semibold text-blue-700">
                                      {studentInitials}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-xs leading-tight truncate">
                                      {formatFullName(student.firstName, student.lastName)}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {className}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              {/* Quizzes - Editable */}
                              {orderedSubExams.quizzes.map(renderSubExamCell)}
                              {/* Assignments - Editable */}
                              {orderedSubExams.assignments.map(renderSubExamCell)}
                              {/* Mid Exams - Editable */}
                              {orderedSubExams.midExams.map(renderSubExamCell)}
                              {/* Sub-total - Read-only (Auto-calculated) */}
                              <TableCell className="text-center font-semibold bg-blue-50/50 border-l-2 border-blue-300 p-1">
                                <div className="space-y-0.5">
                                  <div className="text-sm font-bold">{subtotals.subTotal.total.toFixed(1)}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    / 60
                                  </div>
                                </div>
                              </TableCell>
                              {/* General Test - Editable */}
                              {orderedSubExams.generalTests.map(renderSubExamCell)}
                              {/* Grand Total - Read-only (Auto-calculated) */}
                              <TableCell className="text-center font-semibold bg-green-50/50 sticky right-0 border-l-2 border-green-300 p-1">
                                <div className="space-y-0.5">
                                  <div className="text-sm font-bold">{subtotals.grandTotal.total.toFixed(1)}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    / 100
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
              </div>

              {/* Pagination Component */}
              {studentsData?.pagination && studentsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-4 pb-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, studentsData.pagination.total)} of{" "}
                    {studentsData.pagination.total} students
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(studentsData.pagination!.totalPages, p + 1))
                      }
                      disabled={page === studentsData.pagination!.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
