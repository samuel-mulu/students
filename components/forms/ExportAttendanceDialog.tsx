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
import { attendanceApi } from '@/lib/api/attendance';
import { useCalendarSystem } from '@/lib/context/calendar-context';
import { formatDateForUI } from '@/lib/utils/date';
import { formatDate } from '@/lib/utils/format';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExportAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  date: string;
}

export function ExportAttendanceDialog({
  open,
  onOpenChange,
  classId,
  className,
  date
}: ExportAttendanceDialogProps) {
  const { calendarSystem } = useCalendarSystem();
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const response = await attendanceApi.getByClass(classId, date);

      // Handle the data structure returned by getByClass
      // Backend returns { class, date, students: [{ student, attendance }] }
      let studentsWithAttendance = [];
      if (response && response.students) {
        studentsWithAttendance = response.students;
      } else if (Array.isArray(response)) {
        // Fallback for different API versions
        studentsWithAttendance = response;
      }

      if (studentsWithAttendance.length === 0) {
        toast.info('No attendance records found for this class and date');
        setIsExporting(false);
        return;
      }

      if (exportType === 'csv') {
        handleCSVExport(studentsWithAttendance);
      } else {
        handlePDFExport(studentsWithAttendance);
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

  const handleCSVExport = (data: any[]) => {
    const headers = ['No', 'Student Name', 'Status', 'Reason', 'Date', 'Class'];
    const rows = data.map((item, index) => {
      const student = item.student || item;
      const attendance = item.attendance || item;

      const firstName = student.firstName || '';
      const lastName = student.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const status = attendance.status || '-';
      const notes = attendance.notes || '-';

      return [
        index + 1,
        fullName,
        status,
        notes,
        formatDateForUI(date, calendarSystem),
        className
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
    link.setAttribute('download', `attendance_${className}_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePDFExport = (data: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = data.map((item, index) => {
      const student = item.student || item;
      const attendance = item.attendance || item;

      const firstName = student.firstName || '';
      const lastName = student.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const status = attendance.status || 'present';
      const notes = attendance.notes || '-';

      const statusColor = status === 'present' ? '#16a34a' : status === 'absent' ? '#dc2626' : '#ca8a04';

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${fullName}</td>
          <td style="color: ${statusColor}; font-weight: bold; text-transform: capitalize;">${status}</td>
          <td>${notes}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance Report - ${className} - ${date}</title>
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
            <h1>Attendance Report</h1>
          </div>
          <div class="meta">
            <div>
              <p><strong>Class:</strong> ${className}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Date:</strong> ${formatDateForUI(date, calendarSystem)}</p>
              <p><strong>Report Date:</strong> ${formatDate(new Date(), calendarSystem)}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th>Student Name</th>
                <th>Status</th>
                <th>Reason/Notes</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div style="margin-top: 20px; text-align: right; font-size: 12px; color: #666;">
            <p>Total Students: ${data.length}</p>
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
          <DialogTitle>Export Attendance Report</DialogTitle>
          <DialogDescription>
            Download the attendance report for <strong>{className}</strong> on <strong>{formatDateForUI(date, calendarSystem)}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
          <Button onClick={handleExport} disabled={isExporting}>
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
