'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { studentsApi } from '@/lib/api/students';
import { useCalendarSystem } from '@/lib/context/calendar-context';
import { useActiveAcademicYear } from '@/lib/hooks/use-academicYears';
import { useClassesByGradeAndYear } from '@/lib/hooks/use-classes';
import { useGrades } from '@/lib/hooks/use-grades';
import { formatDate } from '@/lib/utils/format';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExportStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportStudentsDialog({ open, onOpenChange }: ExportStudentsDialogProps) {
  const { calendarSystem } = useCalendarSystem();
  const { data: activeYearData } = useActiveAcademicYear();
  const { data: gradesData } = useGrades();
  const grades = gradesData?.data || [];
  const academicYearId = activeYearData?.data?.id || '';

  const [classStatus, setClassStatus] = useState<string>('assigned');
  const [gradeId, setGradeId] = useState<string>('all');
  const [classId, setClassId] = useState<string>('all');
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const { data: classesData } = useClassesByGradeAndYear(gradeId === 'all' ? '' : gradeId, academicYearId);
  const classes = classesData?.data || [];

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const response = await studentsApi.getAll({
        classStatus: classStatus === 'all' ? undefined : classStatus as 'new' | 'assigned',
        gradeId: gradeId === 'all' ? undefined : gradeId,
        classId: classId === 'all' ? undefined : classId,
        limit: 1000,
      });

      const students = response.students;

      if (students.length === 0) {
        toast.info('No students found for the selected criteria');
        setIsExporting(false);
        return;
      }

      if (exportType === 'csv') {
        handleCSVExport(students);
      } else {
        handlePDFExport(students);
      }

      toast.success('Export successful');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error('Export failed', {
        description: error.message || 'An error occurred during export',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCSVExport = (students: any[]) => {
    const headers = ['First Name', 'Last Name', 'Gender', 'Class', 'Parent Name', 'Parent Phone', 'Status', 'Parents Portal'];
    const rows = students.map(student => {
      const currentClass = student.classHistory?.find((ch: any) => !ch.endDate);
      const className = currentClass?.class?.name || 'Not Assigned';

      return [
        student.firstName,
        student.lastName,
        student.gender,
        className,
        student.parentName,
        student.parentPhone,
        student.classStatus,
        student.parentsPortal ? 'Enabled' : 'Disabled'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `students_${classStatus}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePDFExport = (students: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const gradeName = gradeId === 'all' ? 'All Grades' : grades.find(g => g.id === gradeId)?.name || '';
    const selectedClass = classes.find(c => c.id === classId);
    const className = classId === 'all' ? 'All Sections' : selectedClass ? selectedClass.name : '';

    const rows = students.map((student, index) => {
      const currentClass = student.classHistory?.find((ch: any) => !ch.endDate);
      const actualClassName = currentClass?.class?.name || 'Not Assigned';

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${student.firstName} ${student.lastName}</td>
          <td>${student.gender}</td>
          <td>${actualClassName}</td>
          <td>${student.parentPhone}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student List - ${gradeName} - ${className}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; position: relative; }
            .header img { height: 60px; width: auto; margin-bottom: 5px; }
            h1 { margin: 0; font-size: 24px; color: #1e3a8a; }
            .school-name { font-size: 18px; font-weight: bold; color: #3b82f6; margin-bottom: 5px; }
            .developer-notice { font-size: 9px; color: #666; position: absolute; top: -15px; right: 0; font-style: italic; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f3f4f6; padding: 10px; text-align: left; border: 1px solid #ddd; font-size: 13px; }
            td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
            @media print {
              body { margin: 0; }
              .header { border-bottom-color: #000; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="developer-notice">© 2ms deelopers 0962520885</div>
            <img src="/logo.jpg" alt="Logo" />
            <div class="school-name">DIGITAL KG</div>
            <h1>Student List Report</h1>
          </div>
          <div class="meta">
            <div>
              <p><strong>Status:</strong> ${classStatus.toUpperCase()}</p>
              <p><strong>Grade:</strong> ${gradeName}</p>
              <p><strong>Section:</strong> ${className}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Report Date:</strong> ${formatDate(new Date(), calendarSystem)}</p>
              <p><strong>Total Students:</strong> ${students.length}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th>Student Name</th>
                <th>Gender</th>
                <th>Class</th>
                <th>Parent Phone</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
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
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Students List</DialogTitle>
          <DialogDescription>
            Choose filters to generate the student list report.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">Class Status</Label>
            <Select value={classStatus} onValueChange={(val) => {
              setClassStatus(val);
              if (val === 'new') {
                setGradeId('all');
                setClassId('all');
              }
            }}>
              <SelectTrigger id="status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="new">New (Unassigned)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {classStatus !== 'new' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade {classStatus === 'assigned' && '*'}</Label>
                <Select value={gradeId} onValueChange={(val) => {
                  setGradeId(val);
                  setClassId('all');
                }}>
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {grades.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="class">Section / Class (Optional)</Label>
                <Select value={classId} onValueChange={setClassId} disabled={gradeId === 'all'}>
                  <SelectTrigger id="class">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="exportType">Download Format</Label>
            <Select value={exportType} onValueChange={(val: any) => setExportType(val)}>
              <SelectTrigger id="exportType">
                <SelectValue placeholder="CSV File" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV File (.csv)</SelectItem>
                <SelectItem value="pdf">PDF Document (.pdf)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || (classStatus === 'assigned' && gradeId === 'all')}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download {exportType.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
