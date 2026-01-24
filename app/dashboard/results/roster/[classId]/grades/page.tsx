'use client';

import { use, useMemo, useState } from 'react';
import { useClass } from '@/lib/hooks/use-classes';
import { useRosterResultsSemesters } from '@/lib/hooks/use-results';
import { BackButton } from '@/components/shared/BackButton';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatFullName, getInitials } from '@/lib/utils/format';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

type Mode = 'term1' | 'term2' | 'avg';

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

export default function RosterGradesListPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  const { data: classData } = useClass(classId);
  const { data: rosterData, isLoading, error } = useRosterResultsSemesters(classId);
  const roster = rosterData?.data as RosterSemestersResponse | undefined;

  const [mode, setMode] = useState<Mode>('avg');

  const modeLabel = useMemo(() => {
    if (!roster?.terms) return 'Full Year (Average)';
    if (mode === 'term1') return roster.terms.term1.name;
    if (mode === 'term2') return roster.terms.term2.name;
    return 'Full Year (Average)';
  }, [mode, roster]);

  const formatRank = (rank: number) => {
    const mod10 = rank % 10;
    const mod100 = rank % 100;
    if (mod10 === 1 && mod100 !== 11) return `${rank}st`;
    if (mod10 === 2 && mod100 !== 12) return `${rank}nd`;
    if (mod10 === 3 && mod100 !== 13) return `${rank}rd`;
    return `${rank}th`;
  };

  const calcStudentAvg = (student: RosterSemestersResponse['students'][number], key: Mode) => {
    const subjects = student.subjects || [];
    if (!subjects.length) return 0;
    const sum = subjects.reduce((acc, s) => {
      if (key === 'term1') return acc + (s.term1Total || 0);
      if (key === 'term2') return acc + (s.term2Total || 0);
      return acc + (s.averageTotal || 0);
    }, 0);
    return sum / subjects.length;
  };

  const ranked = useMemo(() => {
    const students = roster?.students || [];

    const entries = students.map((s) => ({
      studentId: s.studentId,
      firstName: s.firstName,
      lastName: s.lastName,
      avg: calcStudentAvg(s, mode),
      nameKey: `${s.firstName} ${s.lastName}`.toLowerCase(),
    }));

    entries.sort((a, b) => {
      if (b.avg !== a.avg) return b.avg - a.avg;
      return a.nameKey.localeCompare(b.nameKey);
    });

    // Competition ranking: 1,1,3
    let prevScore: number | null = null;
    let currentRank = 0;
    return entries.map((e, idx) => {
      if (prevScore === null || e.avg !== prevScore) {
        currentRank = idx + 1;
        prevScore = e.avg;
      }
      return { ...e, rank: currentRank };
    });
  }, [roster, mode]);

  if (isLoading || !classData?.data) {
    return <LoadingState rows={10} columns={4} />;
  }

  if (error) {
    return <ErrorState message="Failed to load grades list" onRetry={() => window.location.reload()} />;
  }

  if (!roster || !roster.students || roster.students.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton href={`/dashboard/results/roster/${classId}`} />
          <div>
            <h1 className="text-xl font-semibold">Grades List</h1>
            <p className="text-sm text-muted-foreground mt-1">{classData.data.name}</p>
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
          <BackButton href={`/dashboard/results/roster/${classId}`} />
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">Grades List</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {roster.class.name} — {modeLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="term1">{roster.terms.term1.name}</SelectItem>
              <SelectItem value="term2">{roster.terms.term2.name}</SelectItem>
              <SelectItem value="avg">Full Year (Average)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const headers = ['Rank', 'Student Name', 'Average Score'];
              const rows = ranked.map((r) => [
                formatRank(r.rank),
                formatFullName(r.firstName, r.lastName),
                r.avg.toFixed(2),
              ]);

              const csvContent = [
                [`Class: ${roster.class.name}`, `Mode: ${modeLabel}`, `Date: ${format(new Date(), 'yyyy-MM-dd')}`].join(','),
                headers.join(','),
                ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
              ].join('\n');

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', `grades-${roster.class.name}-${modeLabel}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students by Grade</CardTitle>
          <CardDescription>Sorted by rank (highest average first)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-20 text-center">Grade</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="w-40 text-center">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranked.map((r) => {
                    const initials = getInitials(r.firstName, r.lastName);
                    return (
                      <TableRow key={r.studentId} className="hover:bg-slate-50/50">
                        <TableCell className="text-center font-bold">{formatRank(r.rank)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-semibold text-blue-700">{initials}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm truncate">
                                {formatFullName(r.firstName, r.lastName)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{r.avg.toFixed(2)}</TableCell>
                      </TableRow>
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

