'use client';

import { useState } from 'react';
import { usePromotionPreview, usePromoteStudents } from '@/lib/hooks/use-promotion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, ArrowRight, RefreshCw, CheckCircle2, XCircle, Users } from 'lucide-react';
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

export default function PromotionPage() {
  const { hasRole } = useAuthStore();
  const { data, isLoading, error, refetch } = usePromotionPreview();
  const promoteStudents = usePromoteStudents();
  const [confirmDialog, setConfirmDialog] = useState(false);

  if (isLoading) {
    return <LoadingState rows={5} columns={4} />;
  }

  if (error) {
    return <ErrorState message="Failed to load promotion preview" onRetry={() => refetch()} />;
  }

  const preview = data?.data;

  if (!preview) {
    return <ErrorState message="No promotion data available" onRetry={() => refetch()} />;
  }

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

      {!preview.canPromote && (
        <Card className="border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-700">
              <XCircle className="h-5 w-5" />
              <p className="font-semibold">
                Term 2 must be closed before promotion can proceed.
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Current Term 2 Status: <strong>{preview.term2Status}</strong>
            </p>
          </CardContent>
        </Card>
      )}

      {preview.activeAcademicYear && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Active Academic Year: {preview.activeAcademicYear.name}
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
        <CardHeader>
          <CardTitle>Promotion Preview</CardTitle>
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
                {preview.students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  preview.students.map((student) => (
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
        description="Are you sure you want to execute the promotion? This action will close current student class records and create new ones for the next academic year. This cannot be undone."
      />
    </div>
  );
}

