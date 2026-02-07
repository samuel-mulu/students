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
import { formatDate, generateAllMonths } from '@/lib/utils/format';
import { Download, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface ExportPaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportPaymentsDialog({ open, onOpenChange }: ExportPaymentsDialogProps) {
  const { calendarSystem } = useCalendarSystem();
  const { data: activeYearData } = useActiveAcademicYear();
  const { data: gradesData } = useGrades();
  const grades = gradesData?.data || [];
  const academicYearId = activeYearData?.data?.id || '';

  const [gradeId, setGradeId] = useState<string>('');
  const [classId, setClassId] = useState<string>('all');
  const [paymentStatus, setPaymentStatus] = useState<string>('all');
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const { data: classesData } = useClassesByGradeAndYear(gradeId, academicYearId);
  const classes = classesData?.data || [];

  const months = useMemo(() => generateAllMonths(new Date().getFullYear(), calendarSystem), [calendarSystem]);

  const handleExport = async () => {
    if (!gradeId) {
      toast.error('Grade is required');
      return;
    }

    try {
      setIsExporting(true);

      const apiPaymentStatus = paymentStatus === 'paid' ? 'confirmed' :
        paymentStatus === 'unpaid' ? 'pending' : undefined;

      const response = await studentsApi.getAll({
        gradeId,
        classId: classId === 'all' ? undefined : classId,
        month,
        year: parseInt(month.split('-')[0]),
        paymentStatus: apiPaymentStatus,
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
    const headers = ['First Name', 'Last Name', 'Grade', 'Class', 'Month', 'Status', 'Amount', 'Receipt No', 'Payment Date'];
    const rows = students.map(student => {
      const payment = student.payments?.find((p: any) => p.month === month);
      const status = payment ? payment.status : 'Pending';
      const amount = payment ? payment.amount : '-';
      const receiptNo = payment?.receipt?.receiptNumber || '-';
      const paymentDate = payment?.paymentDate ? formatDate(payment.paymentDate, calendarSystem) : '-';

      const currentClass = student.classHistory?.find((ch: any) => !ch.endDate);
      const className = currentClass?.class?.name || 'Not Assigned';
      const gradeName = currentClass?.class?.grade?.name || '-';

      return [
        student.firstName,
        student.lastName,
        gradeName,
        className,
        month,
        status,
        amount,
        receiptNo,
        paymentDate
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_${gradeId}_${month}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePDFExport = (students: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const gradeName = grades.find(g => g.id === gradeId)?.name || '';
    const selectedClass = classes.find(c => c.id === classId);
    const className = selectedClass ? selectedClass.name : 'All Sections';
    const monthLabel = months.find(m => m.value === month)?.label || month;

    const rows = students.map((student, index) => {
      const payment = student.payments?.find((p: any) => p.month === month);
      const status = payment ? payment.status : 'Pending';
      const amount = payment ? payment.amount : '-';
      const receiptNo = payment?.receipt?.receiptNumber || '-';
      const paymentDate = payment?.paymentDate ? formatDate(payment.paymentDate, calendarSystem) : '-';

      const currentClass = student.classHistory?.find((ch: any) => !ch.endDate);
      const actualClassName = currentClass?.class?.name || 'Not Assigned';

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${student.firstName} ${student.lastName}</td>
          <td>${actualClassName}</td>
          <td class="${status.toLowerCase() === 'confirmed' ? 'text-green' : 'text-red'}">${status}</td>
          <td>${amount !== '-' ? `ETB ${amount}` : '-'}</td>
          <td>${receiptNo}</td>
          <td>${paymentDate}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Report - ${gradeName} - ${monthLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            h1 { margin: 0; font-size: 24px; color: #1e3a8a; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f3f4f6; padding: 10px; text-align: left; border: 1px solid #ddd; font-size: 13px; }
            td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
            .text-green { color: #16a34a; font-weight: bold; }
            .text-red { color: #dc2626; font-weight: bold; }
            @media print {
              body { margin: 0; }
              .header { border-bottom-color: #000; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payment Status Report</h1>
          </div>
          <div class="meta">
            <div>
              <p><strong>Grade:</strong> ${gradeName}</p>
              <p><strong>Section:</strong> ${className}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Month:</strong> ${monthLabel}</p>
              <p><strong>Report Date:</strong> ${formatDate(new Date(), calendarSystem)}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Receipt No</th>
                <th>Payment Date</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div style="margin-top: 20px; text-align: right; font-size: 12px; color: #666;">
            <p>Total Students: ${students.length}</p>
          </div>
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
          <DialogTitle>Export Payment Report</DialogTitle>
          <DialogDescription>
            Choose filters to generate the payment report.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="grade">Grade *</Label>
            <Select value={gradeId} onValueChange={(val) => {
              setGradeId(val);
              setClassId('all');
            }}>
              <SelectTrigger id="grade">
                <SelectValue placeholder="Select Grade" />
              </SelectTrigger>
              <SelectContent>
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
            <Select value={classId} onValueChange={setClassId} disabled={!gradeId}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid Only</SelectItem>
                  <SelectItem value="unpaid">Unpaid Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
          <Button onClick={handleExport} disabled={!gradeId || isExporting}>
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
