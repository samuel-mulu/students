'use client';

import { use, useMemo } from 'react';
import { useClass } from '@/lib/hooks/use-classes';
import { useTerms } from '@/lib/hooks/use-terms';
import { useRosterResults } from '@/lib/hooks/use-results';
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
import { Download, Printer } from 'lucide-react';
import { BackButton } from '@/components/shared/BackButton';
import { format } from 'date-fns';

interface RosterResponse {
  class: {
    id: string;
    name: string;
  };
  term: {
    id: string;
    name: string;
  };
  students: Array<{
    studentId: string;
    firstName: string;
    lastName: string;
    subjects: Array<{
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      termTotal: number;
      grade: string;
    }>;
  }>;
}

export default function RosterResultsPage({
  params,
}: {
  params: Promise<{ classId: string; termId: string }>;
}) {
  const { classId, termId } = use(params);
  const { data: classData } = useClass(classId);
  const { data: termsData } = useTerms();
  const { data: rosterData, isLoading, error } = useRosterResults(classId, termId);

  const term = termsData?.data?.find((t) => t.id === termId);
  const roster = rosterData?.data as RosterResponse | undefined;

  // Get all unique subjects from the first student (all students have same subjects)
  const subjects = useMemo(() => {
    if (!roster?.students || roster.students.length === 0) return [];
    return roster.students[0].subjects || [];
  }, [roster]);

  // Calculate overall average for each student and sort alphabetically
  const studentsWithAverages = useMemo(() => {
    if (!roster?.students) return [];
    
    const students = roster.students.map((student) => {
      const validScores = student.subjects
        .filter((s) => s.termTotal > 0)
        .map((s) => s.termTotal);
      
      const overallAverage = validScores.length > 0
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
        : 0;

      return {
        ...student,
        overallAverage,
      };
    });
    
    // Sort alphabetically by first name, then last name
    return students.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [roster]);


  if (isLoading || !classData?.data || !term) {
    return <LoadingState rows={10} columns={5} />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load roster results"
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!roster || !roster.students || roster.students.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton href="/dashboard/results" />
          <div>
            <h1 className="text-xl font-semibold">Roster Results</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {classData.data.name} - {term.name}
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
              {roster.class.name} - {roster.term.name}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Export to CSV
              const headers = ['No', 'Student Name', ...subjects.map(s => s.subjectName), 'Overall Average'];
              const rows = studentsWithAverages.map((student, index) => {
                const row = [
                  index + 1,
                  formatFullName(student.firstName, student.lastName),
                  ...subjects.map(subject => {
                    const subjectData = student.subjects.find(s => s.subjectId === subject.subjectId);
                    if (!subjectData) return '-';
                    return subjectData.termTotal.toFixed(2);
                  }),
                  student.overallAverage > 0 ? student.overallAverage.toFixed(2) : '-'
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
              link.setAttribute('download', `roster-results-${roster.class.name}-${roster.term.name}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
              
              const tableRows = studentsWithAverages.map((student, index) => {
                const studentName = formatFullName(student.firstName, student.lastName);
                const subjectCells = subjects.map(subject => {
                  const subjectData = student.subjects.find(s => s.subjectId === subject.subjectId);
                  if (!subjectData) {
                    return '<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">-</td>';
                  }
                  return `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${subjectData.termTotal.toFixed(2)}</td>`;
                }).join('');
                
                return `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">${studentName}</td>
                    ${subjectCells}
                    <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${student.overallAverage > 0 ? student.overallAverage.toFixed(2) : '-'}</td>
                  </tr>
                `;
              }).join('');
              
              const subjectHeaders = subjects.map(s => `<th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">${s.subjectName}</th>`).join('');
              
              const htmlContent = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Roster Results - ${roster.class.name} - ${roster.term.name}</title>
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
                      <h1>Roster Results</h1>
                      <p><strong>Class:</strong> ${roster.class.name}</p>
                      <p><strong>Term:</strong> ${roster.term.name}</p>
                      <p><strong>Date:</strong> ${format(new Date(), 'MMMM dd, yyyy')}</p>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">No</th>
                          <th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold;">Student Name</th>
                          ${subjectHeaders}
                          <th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f3f4f6; font-weight: bold; text-align: center;">Overall Average</th>
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
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster Results</CardTitle>
          <CardDescription>
            View term totals for all students across all subjects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-16 sticky left-0 bg-slate-50 z-20 text-center">NO</TableHead>
                  <TableHead className="min-w-[200px] sticky left-16 bg-slate-50 z-20 border-r">
                    Student
                  </TableHead>
                  {subjects.map((subject) => (
                    <TableHead key={subject.subjectId} className="min-w-[140px] text-center">
                      <div className="font-semibold text-sm py-2">{subject.subjectName}</div>
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[120px] text-center bg-slate-50 sticky right-0">
                    <div className="space-y-1 py-2">
                      <div className="font-semibold">Average</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsWithAverages.map((student, index) => {
                  const studentInitials = getInitials(student.firstName, student.lastName);
                  
                  return (
                    <TableRow key={student.studentId} className="hover:bg-slate-50/50">
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
                          </div>
                        </div>
                      </TableCell>
                      {subjects.map((subject) => {
                        const subjectData = student.subjects.find(s => s.subjectId === subject.subjectId);
                        if (!subjectData) {
                          return (
                            <TableCell key={subject.subjectId} className="text-center">
                              <div className="text-muted-foreground">-</div>
                            </TableCell>
                          );
                        }
                        
                        return (
                          <TableCell key={subject.subjectId} className="text-center">
                            <div className="font-medium">{subjectData.termTotal.toFixed(2)}</div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-semibold bg-slate-50/50 sticky right-0">
                        <div className="text-base font-bold">
                          {student.overallAverage > 0 ? student.overallAverage.toFixed(2) : '-'}
                        </div>
                      </TableCell>
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
