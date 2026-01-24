'use client';

import { Fragment, use, useMemo } from 'react';
import { useClass } from '@/lib/hooks/use-classes';
import { useRosterResultsSemesters } from '@/lib/hooks/use-results';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatFullName, getInitials } from '@/lib/utils/format';
import { Award, Download, Printer } from 'lucide-react';
import { BackButton } from '@/components/shared/BackButton';
import { format } from 'date-fns';
import Link from 'next/link';

interface RosterSemestersResponse {
  class: { id: string; name: string };
  terms: {
    term1: { id: string; name: string };
    term2: { id: string; name: string };
  };
  students: Array<{
    studentId: string;
    firstName: string;
    lastName: string;
    subjects: Array<{
      subjectId: string;
      subjectName: string;
      subjectCode: string | null;
      term1Total: number;
      term2Total: number;
      averageTotal: number;
    }>;
  }>;
}

const buildSemesters = (term1Name: string, term2Name: string) => [
  { key: 'term1', label: term1Name as const },
  { key: 'term2', label: term2Name as const },
  { key: 'avg', label: 'Average' as const },
];

export default function RosterResultsSemestersPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  const { data: classData } = useClass(classId);
  const { data: rosterData, isLoading, error } = useRosterResultsSemesters(classId);

  const roster = rosterData?.data as RosterSemestersResponse | undefined;

  const subjects = roster?.students?.[0]?.subjects || [];
  const students = roster?.students || [];
  const semesters = buildSemesters(roster?.terms?.term1?.name || 'Term 1', roster?.terms?.term2?.name || 'Term 2');

  const formatRank = (rank: number) => {
    const mod10 = rank % 10;
    const mod100 = rank % 100;
    if (mod10 === 1 && mod100 !== 11) return `${rank}st`;
    if (mod10 === 2 && mod100 !== 12) return `${rank}nd`;
    if (mod10 === 3 && mod100 !== 13) return `${rank}rd`;
    return `${rank}th`;
  };

  const calcStudentAvg = (
    student: RosterSemestersResponse['students'][number],
    key: 'term1' | 'term2' | 'avg'
  ) => {
    if (!subjects.length) return 0;
    const sum = student.subjects.reduce((acc, s) => {
      if (key === 'term1') return acc + (s.term1Total || 0);
      if (key === 'term2') return acc + (s.term2Total || 0);
      return acc + (s.averageTotal || 0);
    }, 0);
    return sum / subjects.length;
  };

  const ranksBySemester = useMemo(() => {
    const buildRanks = (key: 'term1' | 'term2' | 'avg') => {
      const entries = students.map((s) => ({
        studentId: s.studentId,
        name: `${s.firstName} ${s.lastName}`.toLowerCase(),
        score: calcStudentAvg(s, key),
      }));

      entries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name);
      });

      const map = new Map<string, number>();
      let prevScore: number | null = null;
      let currentRank = 0;
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (prevScore === null || e.score !== prevScore) {
          currentRank = i + 1; // competition ranking (1,1,3)
          prevScore = e.score;
        }
        map.set(e.studentId, currentRank);
      }
      return map;
    };

    return {
      term1: buildRanks('term1'),
      term2: buildRanks('term2'),
      avg: buildRanks('avg'),
    };
  }, [students, subjects]);

  if (isLoading || !classData?.data) {
    return <LoadingState rows={10} columns={8} />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load roster results"
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!roster || students.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton href="/dashboard/results" />
          <div>
            <h1 className="text-xl font-semibold">Roster Results</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {classData.data.name}
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No students found in this class.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackButton href="/dashboard/results" />
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">Roster Results</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {roster.class.name} — {roster.terms.term1.name} / {roster.terms.term2.name} / Average
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href={`/dashboard/results/roster/${classId}/grades`}>
              <Award className="h-3 w-3 mr-1" />
              Grades List
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const headers = ['No', 'Student Name', 'Semester', ...subjects.map(s => s.subjectName), 'Average Score', 'Grade'];
              const rows: Array<Array<string | number>> = [];

              students.forEach((student, index) => {
                const studentName = formatFullName(student.firstName, student.lastName);

                semesters.forEach((sem) => {
                  const semesterLabel = sem.label;
                  const values = subjects.map((subject) => {
                    const subjectData = student.subjects.find(s => s.subjectId === subject.subjectId);
                    if (!subjectData) return '0.00';
                    if (sem.key === 'term1') return subjectData.term1Total.toFixed(2);
                    if (sem.key === 'term2') return subjectData.term2Total.toFixed(2);
                    return subjectData.averageTotal.toFixed(2);
                  });

                  const key = sem.key === 'avg' ? 'avg' : sem.key;
                  const avg = calcStudentAvg(student, key).toFixed(2);
                  const rank = ranksBySemester[key].get(student.studentId) || 0;
                  rows.push([index + 1, studentName, semesterLabel, ...values, avg, rank ? formatRank(rank) : '-']);
                });
              });

              const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
              ].join('\n');

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', `roster-results-${roster.class.name}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
              const printWindow = window.open('', '_blank');
              if (!printWindow) return;

              const headerCells = subjects
                .map((s) => `<th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">${s.subjectName}</th>`)
                .join('');

              const rowsHtml = students.map((student, index) => {
                const studentName = formatFullName(student.firstName, student.lastName);

                const semesterRows = semesters.map((sem) => {
                  const subjectCells = subjects.map((subject) => {
                    const subjectData = student.subjects.find(s => s.subjectId === subject.subjectId);
                    const v = !subjectData
                      ? 0
                      : sem.key === 'term1'
                      ? subjectData.term1Total
                      : sem.key === 'term2'
                      ? subjectData.term2Total
                      : subjectData.averageTotal;
                    return `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${v.toFixed(2)}</td>`;
                  }).join('');

                  const avg = calcStudentAvg(student, sem.key === 'avg' ? 'avg' : sem.key);
                  const key = sem.key === 'avg' ? 'avg' : sem.key;
                  const rank = ranksBySemester[key].get(student.studentId) || 0;
                  return `
                    <tr>
                      ${sem.key === 'term1' ? `<td rowspan="3" style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>` : ''}
                      ${sem.key === 'term1' ? `<td rowspan="3" style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">${studentName}</td>` : ''}
                      <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background:#fafafa;">${sem.label}</td>
                      ${subjectCells}
                      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${avg.toFixed(2)}</td>
                      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${rank ? formatRank(rank) : '-'}</td>
                    </tr>
                  `;
                }).join('');

                return semesterRows;
              }).join('');

              const htmlContent = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Roster Results - ${roster.class.name}</title>
                    <style>
                      @media print { body { margin: 0; padding: 20px; } }
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
                      <h1>Roster Results</h1>
                      <p><strong>Class:</strong> ${roster.class.name}</p>
                      <p><strong>Semesters:</strong> ${roster.terms.term1.name}, ${roster.terms.term2.name}, Average</p>
                      <p><strong>Date:</strong> ${format(new Date(), 'MMMM dd, yyyy')}</p>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">No</th>
                          <th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold;">Student Name</th>
                          <th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align:center;">Semesters</th>
                          ${headerCells}
                          <th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">Average Score</th>
                          <th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${rowsHtml}
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
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster Results</CardTitle>
          <CardDescription>
            Term 1, Term 2, and Average for all students across all subjects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-16 sticky left-0 bg-slate-50 z-20 text-center">NO</TableHead>
                    <TableHead className="min-w-[220px] sticky left-16 bg-slate-50 z-20 border-r">Student</TableHead>
                    <TableHead className="min-w-[120px] text-center bg-slate-50 z-10 border-r">Semesters</TableHead>
                    {subjects.map((subject) => (
                      <TableHead key={subject.subjectId} className="min-w-[140px] text-center">
                        <div className="font-semibold text-sm py-2">{subject.subjectName}</div>
                      </TableHead>
                    ))}
                    <TableHead className="min-w-[140px] text-center bg-slate-50 sticky right-[80px]">
                      <div className="space-y-1 py-2">
                        <div className="font-semibold">Average</div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[80px] text-center bg-slate-50 sticky right-0">
                      <div className="space-y-1 py-2">
                        <div className="font-semibold">Grade</div>
                        <div className="text-xs text-muted-foreground">Rank</div>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, index) => {
                    const studentInitials = getInitials(student.firstName, student.lastName);

                    const term1Avg = calcStudentAvg(student, 'term1');
                    const term2Avg = calcStudentAvg(student, 'term2');
                    const avgAvg = calcStudentAvg(student, 'avg');

                    const term1Rank = ranksBySemester.term1.get(student.studentId) || 0;
                    const term2Rank = ranksBySemester.term2.get(student.studentId) || 0;
                    const avgRank = ranksBySemester.avg.get(student.studentId) || 0;

                    const renderSubjectValue = (
                      subjectId: string,
                      key: 'term1' | 'term2' | 'avg'
                    ) => {
                      const subjectData = student.subjects.find((s) => s.subjectId === subjectId);
                      if (!subjectData) return '0.00';
                      if (key === 'term1') return subjectData.term1Total.toFixed(2);
                      if (key === 'term2') return subjectData.term2Total.toFixed(2);
                      return subjectData.averageTotal.toFixed(2);
                    };

                    return (
                      <Fragment key={student.studentId}>
                        <TableRow key={`${student.studentId}-term1`} className="hover:bg-slate-50/50">
                          <TableCell rowSpan={3} className="text-center font-medium sticky left-0 bg-background z-10 align-top">
                            {index + 1}
                          </TableCell>
                          <TableCell rowSpan={3} className="sticky left-16 bg-background z-10 border-r align-top">
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
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold bg-slate-50/50 border-r">Term 1</TableCell>
                          {subjects.map((subject) => (
                            <TableCell key={`${student.studentId}-${subject.subjectId}-t1`} className="text-center">
                              <div className="font-medium">{renderSubjectValue(subject.subjectId, 'term1')}</div>
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-semibold bg-slate-50/50 sticky right-[80px]">
                            <div className="text-base font-bold">{term1Avg.toFixed(2)}</div>
                          </TableCell>
                          <TableCell className="text-center font-semibold bg-slate-50/50 sticky right-0">
                            <div className="text-base font-bold">{term1Rank ? formatRank(term1Rank) : '-'}</div>
                          </TableCell>
                        </TableRow>

                        <TableRow key={`${student.studentId}-term2`} className="hover:bg-slate-50/50">
                          <TableCell className="text-center font-semibold bg-slate-50/50 border-r">Term 2</TableCell>
                          {subjects.map((subject) => (
                            <TableCell key={`${student.studentId}-${subject.subjectId}-t2`} className="text-center">
                              <div className="font-medium">{renderSubjectValue(subject.subjectId, 'term2')}</div>
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-semibold bg-slate-50/50 sticky right-[80px]">
                            <div className="text-base font-bold">{term2Avg.toFixed(2)}</div>
                          </TableCell>
                          <TableCell className="text-center font-semibold bg-slate-50/50 sticky right-0">
                            <div className="text-base font-bold">{term2Rank ? formatRank(term2Rank) : '-'}</div>
                          </TableCell>
                        </TableRow>

                        <TableRow key={`${student.studentId}-avg`} className="hover:bg-slate-50/50">
                          <TableCell className="text-center font-semibold bg-slate-50/50 border-r">Average</TableCell>
                          {subjects.map((subject) => (
                            <TableCell key={`${student.studentId}-${subject.subjectId}-avg`} className="text-center">
                              <div className="font-medium">{renderSubjectValue(subject.subjectId, 'avg')}</div>
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-semibold bg-slate-50/50 sticky right-[80px]">
                            <div className="text-base font-bold">{avgAvg.toFixed(2)}</div>
                          </TableCell>
                          <TableCell className="text-center font-semibold bg-slate-50/50 sticky right-0">
                            <div className="text-base font-bold">{avgRank ? formatRank(avgRank) : '-'}</div>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

