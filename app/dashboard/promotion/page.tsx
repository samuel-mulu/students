'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePromotionPreview, usePromoteStudents } from '@/lib/hooks/use-promotion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GraduationCap, ArrowRight, RefreshCw, CheckCircle2, XCircle, Users, Search } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatFullName } from '@/lib/utils/format';
import { PromotionBlocker } from '@/lib/types';
import { Input } from '@/components/ui/input';

const BLOCKER_MESSAGES: Record<
  PromotionBlocker,
  { title: string; description: string; linkLabel: string }
> = {
  NO_ACTIVE_YEAR: {
    title: 'No active academic year',
    description: 'Set an active academic year before reviewing promotion.',
    linkLabel: 'Go to Academic Years',
  },
  TERM1_NOT_FOUND: {
    title: 'Term 1 not found',
    description: 'Create Term 1 for the active academic year (name must be exactly "Term 1").',
    linkLabel: 'Go to Academic Years',
  },
  TERM2_NOT_FOUND: {
    title: 'Term 2 not found',
    description: 'Create Term 2 for the active academic year (name must be exactly "Term 2").',
    linkLabel: 'Go to Academic Years',
  },
  TERM2_NOT_CLOSED: {
    title: 'Term 2 must be closed',
    description:
      'Close Term 2 after all marks are entered. Current status is shown below.',
    linkLabel: 'Go to Academic Years',
  },
  INVALID_YEAR_FORMAT: {
    title: 'Invalid academic year format',
    description: 'The active academic year name must be in YYYY-YYYY format (e.g. 2024-2025).',
    linkLabel: 'Go to Academic Years',
  },
  ALREADY_PROMOTED: {
    title: 'Promotion already executed',
    description: 'Students already have active records in the next academic year.',
    linkLabel: 'Go to Academic Years',
  },
};

const ALL_CLASSES = '__all__';
const ALL_OUTCOMES = '__all__';

type OutcomeFilter = typeof ALL_OUTCOMES | 'PASS' | 'REPEAT' | 'GRADUATE';

export default function PromotionPage() {
  const { hasRole } = useAuthStore();
  const { data, isLoading, error, refetch } = usePromotionPreview({ includeStudents: true });
  const promoteStudents = usePromoteStudents();
  const [classFilter, setClassFilter] = useState<string>(ALL_CLASSES);
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>(ALL_OUTCOMES);
  const [nameSearch, setNameSearch] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);

  const preview = data?.data;

  const displayStudents = useMemo(() => {
    if (!preview?.students) return [];
    let filtered = preview.students;
    if (classFilter !== ALL_CLASSES) {
      filtered = filtered.filter((s) => s.currentClassId === classFilter);
    }
    if (outcomeFilter !== ALL_OUTCOMES) {
      filtered = filtered.filter((s) => s.outcome === outcomeFilter);
    }
    const query = nameSearch.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((s) => {
        const fullName = formatFullName(s.firstName, s.lastName).toLowerCase();
        return (
          s.firstName.toLowerCase().includes(query) ||
          s.lastName.toLowerCase().includes(query) ||
          fullName.includes(query)
        );
      });
    }
    return filtered;
  }, [preview?.students, classFilter, outcomeFilter, nameSearch]);

  if (isLoading) {
    return <LoadingState rows={5} columns={4} />;
  }

  if (error) {
    const errorMessage =
      (error as Error & { errorMessage?: string }).errorMessage ||
      error.message ||
      'Failed to load promotion preview';
    return <ErrorState message={errorMessage} onRetry={() => refetch()} />;
  }

  if (!preview) {
    return <ErrorState message="No promotion data available" onRetry={() => refetch()} />;
  }

  const hasTermBlockers =
    preview.blockers?.includes('TERM1_NOT_FOUND') ||
    preview.blockers?.includes('TERM2_NOT_FOUND');

  const handlePromote = async () => {
    await promoteStudents.mutateAsync();
    setConfirmDialog(false);
    refetch();
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'PASS':
        return <Badge className="bg-green-500">PASS</Badge>;
      case 'REPEAT':
        return <Badge className="bg-yellow-500">REPEAT</Badge>;
      case 'GRADUATE':
        return <Badge className="bg-blue-500">GRADUATE</Badge>;
      default:
        return <Badge>{outcome}</Badge>;
    }
  };

  const confirmDescription =
    preview.activeAcademicYear && preview.nextAcademicYearName
      ? `This will promote, repeat, or graduate all ${preview.summary.total} students, close ${preview.activeAcademicYear.name}, activate ${preview.nextAcademicYearName}, and create Term 1 and Term 2 for the new year. This cannot be undone.`
      : 'Are you sure you want to execute the promotion? This action cannot be undone.';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Student Promotion</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and execute student promotion for the academic year
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {preview.blockers?.map((blocker) => {
        const info = BLOCKER_MESSAGES[blocker];
        if (!info) return null;
        return (
          <Card key={blocker} className="border-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2 text-yellow-700">
                <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="font-semibold">{info.title}</p>
                  <p className="text-sm text-muted-foreground">{info.description}</p>
                  {blocker === 'TERM2_NOT_CLOSED' && preview.term2Status && (
                    <p className="text-sm text-muted-foreground">
                      Current Term 2 status: <strong>{preview.term2Status}</strong>
                    </p>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/academic-years">{info.linkLabel}</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {preview.activeAcademicYear && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Active Academic Year: {preview.activeAcademicYear.name}
              {preview.nextAcademicYearName && (
                <span className="text-sm font-normal text-muted-foreground">
                  → Next: {preview.nextAcademicYearName}
                </span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{preview.summary.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Passing</p>
                <p className="text-2xl font-bold text-green-600">{preview.summary.passing}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Repeating</p>
                <p className="text-2xl font-bold text-yellow-600">{preview.summary.repeating}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Graduating</p>
                <p className="text-2xl font-bold text-blue-600">{preview.summary.graduating}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
          <div>
            <CardTitle>Promotion Preview</CardTitle>
            {!hasTermBlockers && preview.students.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Showing {displayStudents.length} of {preview.students.length} students
              </p>
            )}
          </div>
          {!hasTermBlockers && preview.students.length > 0 && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <div className="relative sm:w-[220px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              {preview.classes.length > 0 && (
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="sm:w-[200px]">
                    <SelectValue placeholder="Filter by class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CLASSES}>
                      All classes ({preview.summary.total})
                    </SelectItem>
                    {preview.classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} ({cls.studentCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select
                value={outcomeFilter}
                onValueChange={(v) => setOutcomeFilter(v as OutcomeFilter)}
              >
                <SelectTrigger className="sm:w-[180px]">
                  <SelectValue placeholder="Filter by outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_OUTCOMES}>
                    All outcomes ({preview.summary.total})
                  </SelectItem>
                  <SelectItem value="PASS">
                    Pass ({preview.summary.passing})
                  </SelectItem>
                  <SelectItem value="REPEAT">
                    Repeat ({preview.summary.repeating})
                  </SelectItem>
                  <SelectItem value="GRADUATE">
                    Graduate ({preview.summary.graduating})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Current Class</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Next Class</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {hasTermBlockers
                        ? 'Fix term setup to see student preview'
                        : nameSearch.trim()
                          ? 'No students match your search'
                          : 'No students found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayStudents.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell className="font-medium">
                        {formatFullName(student.firstName, student.lastName)}
                      </TableCell>
                      <TableCell>{student.currentClassName}</TableCell>
                      <TableCell>{student.overallAverage.toFixed(2)}%</TableCell>
                      <TableCell>{getOutcomeBadge(student.outcome)}</TableCell>
                      <TableCell>
                        {student.outcome === 'GRADUATE' ? (
                          <span className="text-muted-foreground">Graduated</span>
                        ) : student.nextClassName ? (
                          <div className="flex items-center gap-2">
                            <span>{student.nextClassName}</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {hasRole(['OWNER', 'REGISTRAR']) && preview.canPromote && (
        <div className="flex justify-end">
          <Button
            onClick={() => setConfirmDialog(true)}
            disabled={promoteStudents.isPending}
            size="lg"
          >
            {promoteStudents.isPending ? 'Processing...' : 'Execute Promotion'}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog}
        onOpenChange={setConfirmDialog}
        onConfirm={handlePromote}
        title="Confirm Promotion"
        description={confirmDescription}
        confirmText="Execute Promotion"
        variant="destructive"
      />
    </div>
  );
}
