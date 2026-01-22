'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePaymentReports, useRegistrarPaymentReports } from '@/lib/hooks/use-reports';
import { useAcademicYears, useActiveAcademicYear } from '@/lib/hooks/use-academicYears';
import { usePaymentTypes } from '@/lib/hooks/use-payment-types';
import { useUsers } from '@/lib/hooks/use-users';
import { useAuthStore } from '@/lib/store/auth-store';
import { generateAllMonths, formatMonthYear, formatDate, formatDateTime } from '@/lib/utils/format';
import { useCalendarSystem } from '@/lib/context/calendar-context';
import { formatDateForUI } from '@/lib/utils/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/format';
import { DollarSign, TrendingUp, FileText, Download, Printer, RefreshCw, Users, UserCheck, UserX, RotateCcw, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const { calendarSystem } = useCalendarSystem();
  const isOwner = user?.role === 'OWNER';
  const isRegistrar = user?.role === 'REGISTRAR';

  // View mode state
  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>(isRegistrar ? 'daily' : 'monthly');

  // Filters state
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [registrarFilter, setRegistrarFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [showPaidProgress, setShowPaidProgress] = useState<boolean>(true); // Toggle between paid and unpaid

  // Data hooks
  const { data: academicYearsData } = useAcademicYears();
  const { data: activeYearData } = useActiveAcademicYear();
  const { data: paymentTypesData } = usePaymentTypes();
  const { data: usersData } = useUsers('REGISTRAR');

  const academicYears = Array.isArray(academicYearsData?.data) ? academicYearsData.data : [];
  const paymentTypes = Array.isArray(paymentTypesData?.data) 
    ? paymentTypesData.data.filter(pt => pt.isActive) 
    : [];
  const registrars = Array.isArray(usersData?.data) ? usersData.data : [];

  // Generate month options
  const monthOptions = useMemo(() => {
    return generateAllMonths(new Date().getFullYear(), calendarSystem);
  }, [calendarSystem]);

  // Set default academic year
  useEffect(() => {
    if (!academicYearFilter && academicYears.length > 0) {
      if (isRegistrar && activeYearData?.data?.id) {
        setAcademicYearFilter(activeYearData.data.id);
      } else if (isOwner) {
        if (activeYearData?.data?.id) {
          setAcademicYearFilter(activeYearData.data.id);
        } else {
          const latest = academicYears.sort(
            (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          )[0];
          if (latest) {
            setAcademicYearFilter(latest.id);
          }
        }
      }
    }
  }, [academicYears, activeYearData, academicYearFilter, isOwner, isRegistrar]);

  // Build API params for Monthly View (both Owner and Registrar use getPaymentReports)
  const monthlyReportParams = useMemo(() => {
    const params: any = {};
    if (isRegistrar && activeYearData?.data?.id) {
      params.academicYearId = activeYearData.data.id;
    } else if (academicYearFilter) {
      params.academicYearId = academicYearFilter;
    }
    if (paymentTypeFilter && paymentTypeFilter !== 'all') {
      params.paymentTypeId = paymentTypeFilter;
    }
    if (paymentMethodFilter && paymentMethodFilter !== 'all') {
      params.paymentMethod = paymentMethodFilter;
    }
    // Don't filter by month in monthly view - we want all months
    if (isOwner && registrarFilter && registrarFilter !== 'all') {
      params.registrarId = registrarFilter;
    }
    return params;
  }, [academicYearFilter, activeYearData?.data?.id, paymentTypeFilter, paymentMethodFilter, registrarFilter, isOwner, isRegistrar]);

  // Build API params for Daily View (both Owner and Registrar use getRegistrarPaymentReports)
  const dailyReportParams = useMemo(() => {
    const academicYearId = isRegistrar 
      ? activeYearData?.data?.id 
      : academicYearFilter;
    
    if (!academicYearId) return null;
    
    const params: any = {
      academicYearId,
    };
    if (paymentTypeFilter && paymentTypeFilter !== 'all') {
      params.paymentTypeId = paymentTypeFilter;
    }
    if (paymentMethodFilter && paymentMethodFilter !== 'all') {
      params.paymentMethod = paymentMethodFilter;
    }
    if (monthFilter && monthFilter !== 'all') {
      params.month = monthFilter;
    }
    return params;
  }, [academicYearFilter, activeYearData?.data?.id, paymentTypeFilter, paymentMethodFilter, monthFilter, isRegistrar]);

  // Fetch monthly reports data (for Monthly View)
  const { data: monthlyReportsData, isLoading: monthlyLoading, error: monthlyError, refetch: monthlyRefetch } = usePaymentReports(
    viewMode === 'monthly' ? monthlyReportParams : undefined
  );
  const monthlyReports = monthlyReportsData?.data;

  // Fetch daily reports data (for Daily View)
  const { data: dailyReportsData, isLoading: dailyLoading, error: dailyError, refetch: dailyRefetch } = useRegistrarPaymentReports(
    viewMode === 'daily' && dailyReportParams ? dailyReportParams : { academicYearId: '' }
  );
  const dailyReports = dailyReportsData?.data;

  // Legacy support - keep for backward compatibility
  const reports = monthlyReports;
  const registrarReports = dailyReports;

  // Process data for table - show selected month or all months (Owner view)
  const tableData = useMemo(() => {
    if (!reports?.byPaymentType) return null;

    // If month filter is set to 'all', show all months, otherwise show only selected month
    const monthsToShow = monthFilter && monthFilter !== 'all'
      ? [monthFilter]
      : [...new Set(reports.byMonth?.map(m => m.month) || [])].sort();

    // Build table rows
    const rows = reports.byPaymentType.map(paymentType => {
      const row: any = {
        paymentTypeId: paymentType.paymentTypeId,
        paymentTypeName: paymentType.paymentTypeName,
        total: paymentType.totalAmount,
        monthlyData: new Map<string, number>(),
      };

      // Fill monthly data
      paymentType.monthlyBreakdown.forEach(breakdown => {
        row.monthlyData.set(breakdown.month, breakdown.amount);
      });

      return row;
    });

    return {
      rows,
      months: monthsToShow,
    };
  }, [reports, monthFilter]);

  // Process data for day-by-day table (used by both Owner and Registrar in Daily view)
  const dailyTableData = useMemo(() => {
    if (!dailyReports?.byDate) return null;

    // Get all unique payment types from all dates
    const paymentTypeSet = new Set<string>();
    const paymentTypeMap = new Map<string, string>(); // paymentTypeId -> paymentTypeName
    
    dailyReports.byDate.forEach(dateReport => {
      dateReport.breakdown.forEach(breakdown => {
        paymentTypeSet.add(breakdown.paymentTypeId);
        paymentTypeMap.set(breakdown.paymentTypeId, breakdown.paymentTypeName);
      });
    });

    const paymentTypes = Array.from(paymentTypeSet);
    const dates = dailyReports.byDate.map(d => d.date);

    // Build table: dates as rows, payment types as columns
    const rows = dates.map(date => {
      const dateReport = dailyReports.byDate.find(d => d.date === date)!;
      const row: any = {
        date,
        totalAmount: dateReport.totalAmount,
        paymentCount: dateReport.paymentCount,
        paymentTypeData: new Map<string, number>(),
      };

      // Fill payment type data for this date
      dateReport.breakdown.forEach(breakdown => {
        row.paymentTypeData.set(breakdown.paymentTypeId, breakdown.amount);
      });

      return row;
    });

    return {
      rows,
      paymentTypes: paymentTypes.map(id => ({
        id,
        name: paymentTypeMap.get(id) || 'Unknown',
      })),
    };
  }, [dailyReports]);

  // Legacy support - keep for backward compatibility
  const registrarTableData = dailyTableData;

  // Export to CSV for Daily View
  const handleDailyExport = () => {
    if (!dailyTableData || !dailyReports) return;

    const headers = ['Date', ...dailyTableData.paymentTypes.map(pt => pt.name), 'Total'];
    
    const rows = dailyTableData.rows.map(row => {
      const date = new Date(row.date);
      return [
        formatDate(date, calendarSystem),
        ...dailyTableData.paymentTypes.map(pt => {
          const amount = row.paymentTypeData.get(pt.id) || 0;
          return amount.toFixed(2);
        }),
        row.totalAmount.toFixed(2),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '', // Empty row
      'Summary',
      `Total Revenue,${dailyReports.summary.totalRevenue.toFixed(2)}`,
      `Today's Revenue,${dailyReports.summary.todayRevenue.toFixed(2)}`,
      `Payment Count,${dailyReports.summary.paymentCount}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `daily-payment-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to CSV for Monthly View
  const handleMonthlyExport = () => {
    if (!monthlyReports) return;

    const headers = ['Month', 'Total Students', 'Paid Students', 'Unpaid Students', 'Progress %', 'Revenue'];
    
    const rows = monthlyReports.byMonth.map(monthData => {
      const monthDate = new Date(monthData.month + '-01');
      const progress = monthData.paymentProgress ?? 0;
      const totalStudents = monthData.totalStudents ?? 0;
      const paidStudents = monthData.paidStudents ?? 0;
      const unpaidStudents = monthData.unpaidStudents ?? 0;
      const [year, month] = monthData.month.split('-');
      
      return [
        formatMonthYear(monthData.month, parseInt(year), calendarSystem),
        totalStudents.toString(),
        paidStudents.toString(),
        unpaidStudents.toString(),
        progress.toFixed(1),
        monthData.totalAmount.toFixed(2),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '', // Empty row
      'Summary',
      `Total Revenue,${monthlyReports.summary.totalRevenue.toFixed(2)}`,
      `Total Students,${monthlyReports.summary.totalStudents}`,
      `Paid Students,${monthlyReports.summary.paidStudents}`,
      `Payment Progress,${monthlyReports.summary.paymentProgress.toFixed(1)}%`,
      `Payment Count,${monthlyReports.summary.paymentCount}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `monthly-student-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Legacy export functions for backward compatibility
  const handleRegistrarExport = handleDailyExport;
  const handleExport = handleMonthlyExport;

  // Print Monthly Report (Student Tracking)
  const handleMonthlyPrint = () => {
    if (!monthlyReports) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const monthRows = monthlyReports.byMonth.map(monthData => {
      const monthDate = new Date(monthData.month + '-01');
      const progress = monthData.paymentProgress ?? 0;
      const totalStudents = monthData.totalStudents ?? 0;
      const paidStudents = monthData.paidStudents ?? 0;
      const unpaidStudents = monthData.unpaidStudents ?? 0;
      
      const [year, month] = monthData.month.split('-');
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatMonthYear(monthData.month, parseInt(year), calendarSystem)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${totalStudents}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #16a34a; font-weight: bold;">${paidStudents}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #ea580c; font-weight: bold;">${unpaidStudents}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${progress.toFixed(1)}%</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(monthData.totalAmount)}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Monthly Student Payment Progress Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #000;
            }
            h1 {
              color: #1f2937;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #f3f4f6;
              padding: 12px;
              text-align: left;
              border: 1px solid #ddd;
              font-weight: bold;
            }
            td {
              padding: 8px;
              border: 1px solid #ddd;
            }
            .summary {
              margin-top: 30px;
              padding: 15px;
              background-color: #f9fafb;
              border: 1px solid #ddd;
            }
            .summary h2 {
              margin-top: 0;
              color: #1f2937;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Monthly Student Payment Progress Report</h1>
          <p><strong>Generated:</strong> ${formatDateTime(new Date())}</p>
          
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th style="text-align: right;">Total Students</th>
                <th style="text-align: right;">Paid Students</th>
                <th style="text-align: right;">Unpaid Students</th>
                <th style="text-align: right;">Progress %</th>
                <th style="text-align: right;">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${monthRows}
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td style="padding: 8px; border: 1px solid #ddd;">Total</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${monthlyReports.summary.totalStudents}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #16a34a;">${monthlyReports.summary.paidStudents}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #ea580c;">${monthlyReports.summary.totalStudents - monthlyReports.summary.paidStudents}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${monthlyReports.summary.paymentProgress.toFixed(1)}%</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(monthlyReports.summary.totalRevenue)}</td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <h2>Summary</h2>
            <div class="summary-row">
              <span><strong>Total Revenue:</strong></span>
              <span>${formatCurrency(monthlyReports.summary.totalRevenue)}</span>
            </div>
            <div class="summary-row">
              <span><strong>Total Students:</strong></span>
              <span>${monthlyReports.summary.totalStudents}</span>
            </div>
            <div class="summary-row">
              <span><strong>Paid Students:</strong></span>
              <span>${monthlyReports.summary.paidStudents}</span>
            </div>
            <div class="summary-row">
              <span><strong>Payment Progress:</strong></span>
              <span>${monthlyReports.summary.paymentProgress.toFixed(1)}%</span>
            </div>
            <div class="summary-row">
              <span><strong>Payment Count:</strong></span>
              <span>${monthlyReports.summary.paymentCount}</span>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Print Daily Report (Money Tracking)
  const handleDailyPrint = () => {
    if (!dailyReports || !dailyTableData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const paymentTypeHeaders = dailyTableData.paymentTypes.map(pt => 
      `<th style="text-align: right;">${pt.name}</th>`
    ).join('');

    const dateRows = dailyTableData.rows.map(row => {
      const date = new Date(row.date);
      const paymentTypeCells = dailyTableData.paymentTypes.map(pt => {
        const amount = row.paymentTypeData.get(pt.id) || 0;
        return `<td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${amount > 0 ? formatCurrency(amount) : '-'}</td>`;
      }).join('');

      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${formatDateForUI(date.toISOString().split('T')[0], calendarSystem)}</td>
          ${paymentTypeCells}
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(row.totalAmount)}</td>
        </tr>
      `;
    }).join('');

    const totalRow = dailyTableData.paymentTypes.map(pt => {
      const typeTotal = dailyReports.byDate.reduce((sum, dateReport) => {
        const breakdown = dateReport.breakdown.find(b => b.paymentTypeId === pt.id);
        return sum + (breakdown?.amount || 0);
      }, 0);
      return `<td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${typeTotal > 0 ? formatCurrency(typeTotal) : '-'}</td>`;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Day-by-Day Payment Tracking Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #000;
            }
            h1 {
              color: #1f2937;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #f3f4f6;
              padding: 12px;
              text-align: left;
              border: 1px solid #ddd;
              font-weight: bold;
            }
            td {
              padding: 8px;
              border: 1px solid #ddd;
            }
            .summary {
              margin-top: 30px;
              padding: 15px;
              background-color: #f9fafb;
              border: 1px solid #ddd;
            }
            .summary h2 {
              margin-top: 0;
              color: #1f2937;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Day-by-Day Payment Tracking Report</h1>
          <p><strong>Generated:</strong> ${formatDateTime(new Date())}</p>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                ${paymentTypeHeaders}
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${dateRows}
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td style="padding: 8px; border: 1px solid #ddd;">Total</td>
                ${totalRow}
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(dailyReports.summary.totalRevenue)}</td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <h2>Summary</h2>
            <div class="summary-row">
              <span><strong>Total Revenue:</strong></span>
              <span>${formatCurrency(dailyReports.summary.totalRevenue)}</span>
            </div>
            <div class="summary-row">
              <span><strong>Today's Revenue:</strong></span>
              <span>${formatCurrency(dailyReports.summary.todayRevenue)}</span>
            </div>
            <div class="summary-row">
              <span><strong>Payment Count:</strong></span>
              <span>${dailyReports.summary.paymentCount}</span>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Legacy print function for backward compatibility
  const handlePrint = () => {
    if (viewMode === 'daily') {
      handleDailyPrint();
    } else {
      handleMonthlyPrint();
    }
  };

  // Registrar View
  if (isRegistrar) {
    const isLoading = viewMode === 'monthly' ? monthlyLoading : dailyLoading;
    const error = viewMode === 'monthly' ? monthlyError : dailyError;
    const refetchFn = viewMode === 'monthly' ? monthlyRefetch : dailyRefetch;

    if (isLoading) {
      return <LoadingState rows={5} columns={6} />;
    }

    if (error) {
      return <ErrorState message="Failed to load reports" onRetry={() => refetchFn()} />;
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Payment Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {viewMode === 'monthly' 
                ? 'Track student payment progress by month' 
                : 'Day-by-day payment tracking for active academic year'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetchFn()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'monthly' | 'daily')}>
          <TabsList>
            <TabsTrigger value="monthly">
              <Users className="mr-2 h-4 w-4" />
              Monthly (Students)
            </TabsTrigger>
            <TabsTrigger value="daily">
              <DollarSign className="mr-2 h-4 w-4" />
              Daily (Money)
            </TabsTrigger>
          </TabsList>

          {/* Monthly View - Student Tracking */}
          <TabsContent value="monthly" className="space-y-6">
            {/* Summary Cards for Monthly View */}
            {monthlyReports && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          {formatCurrency(monthlyReports.summary.totalRevenue)}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          Active Academic Year
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-indigo-200 bg-indigo-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-indigo-700">Total Students</p>
                        <p className="text-2xl font-bold text-indigo-900 mt-1">
                          {monthlyReports.summary.totalStudents}
                        </p>
                        <p className="text-xs text-indigo-600 mt-1">
                          Active Academic Year
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-indigo-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Paid Students</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {monthlyReports.summary.paidStudents}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {monthlyReports.summary.paymentProgress.toFixed(1)}% progress
                        </p>
                      </div>
                      <UserCheck className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters for Monthly View */}
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Academic Year (read-only for Registrar) */}
                  <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <Input
                      value={activeYearData?.data?.name || 'Loading...'}
                      disabled
                      className="bg-muted text-sm h-9"
                    />
                  </div>

                  {/* Payment Type Filter */}
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Payment Types</SelectItem>
                        {paymentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Method Filter */}
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Payment Methods</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Mobile Banking</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Student Progress Table */}
            {!monthlyReports || monthlyReports.byMonth.length === 0 ? (
              <EmptyState
                title="No payment data"
                description="No payment data found for the active academic year"
              />
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Monthly Student Payment Progress</CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleMonthlyExport} 
                        disabled={!monthlyReports}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handlePrint} 
                        disabled={!monthlyReports}
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Total Students</TableHead>
                          <TableHead className="text-right">Paid Students</TableHead>
                          <TableHead className="text-right">Unpaid Students</TableHead>
                          <TableHead className="text-right">Progress %</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyReports.byMonth.map((monthData) => {
                          const monthDate = new Date(monthData.month + '-01');
                          const progress = monthData.paymentProgress ?? 0;
                          const totalStudents = monthData.totalStudents ?? 0;
                          const paidStudents = monthData.paidStudents ?? 0;
                          const unpaidStudents = monthData.unpaidStudents ?? 0;
                          
                          const [year, month] = monthData.month.split('-');
                          return (
                            <TableRow key={monthData.month}>
                              <TableCell className="font-medium">
                                {formatMonthYear(monthData.month, parseInt(year), calendarSystem)}
                              </TableCell>
                              <TableCell className="text-right">{totalStudents}</TableCell>
                              <TableCell className="text-right text-green-600 font-semibold">
                                {paidStudents}
                              </TableCell>
                              <TableCell className="text-right text-orange-600 font-semibold">
                                {unpaidStudents}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-indigo-600 h-2 rounded-full"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium">{progress.toFixed(1)}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatCurrency(monthData.totalAmount)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Total Row */}
                        <TableRow className="bg-muted font-bold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">
                            {monthlyReports.summary.totalStudents}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {monthlyReports.summary.paidStudents}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            {monthlyReports.summary.totalStudents - monthlyReports.summary.paidStudents}
                          </TableCell>
                          <TableCell className="text-right">
                            {monthlyReports.summary.paymentProgress.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(monthlyReports.summary.totalRevenue)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Daily View - Money Tracking */}
          <TabsContent value="daily" className="space-y-6">
            {/* Summary Cards for Daily View */}
            {dailyReports && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          {formatCurrency(dailyReports.summary.totalRevenue)}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          Active Academic Year
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Today's Revenue</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {formatCurrency(dailyReports.summary.todayRevenue)}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {formatDate(new Date(), calendarSystem)}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-700">Payment Count</p>
                        <p className="text-2xl font-bold text-purple-900 mt-1">
                          {dailyReports.summary.paymentCount}
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          Confirmed payments
                        </p>
                      </div>
                      <FileText className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters for Daily View */}
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Academic Year (read-only for Registrar) */}
                  <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <Input
                      value={activeYearData?.data?.name || 'Loading...'}
                      disabled
                      className="bg-muted text-sm h-9"
                    />
                  </div>

                  {/* Payment Type Filter */}
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Payment Types</SelectItem>
                        {paymentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Month Filter */}
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select
                      value={monthFilter}
                      onValueChange={setMonthFilter}
                      disabled={monthOptions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {monthOptions.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Method Filter */}
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Payment Methods</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Mobile Banking</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Day-by-Day Table for Daily View */}
            {!dailyReports || dailyReports.byDate.length === 0 ? (
              <EmptyState
                title="No payment data"
                description="No payment data found for the active academic year"
              />
            ) : dailyTableData ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Day-by-Day Payment Tracking</CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDailyExport} 
                        disabled={!dailyReports}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDailyPrint} 
                        disabled={!dailyReports}
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10">Date</TableHead>
                          {dailyTableData.paymentTypes.map((pt) => (
                            <TableHead key={pt.id} className="text-right">
                              {pt.name}
                            </TableHead>
                          ))}
                          <TableHead className="text-right font-bold">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyTableData.rows.map((row) => {
                          const date = new Date(row.date);
                          return (
                            <TableRow key={row.date}>
                              <TableCell className="sticky left-0 bg-background z-10 font-medium">
                                {formatDate(date, calendarSystem)}
                              </TableCell>
                              {dailyTableData.paymentTypes.map((pt) => {
                                const amount = row.paymentTypeData.get(pt.id) || 0;
                                return (
                                  <TableCell key={pt.id} className="text-right">
                                    {amount > 0 ? formatCurrency(amount) : '-'}
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-right font-bold">
                                {formatCurrency(row.totalAmount)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Total Row */}
                        <TableRow className="bg-muted font-bold">
                          <TableCell className="sticky left-0 bg-muted z-10">Total</TableCell>
                          {dailyTableData.paymentTypes.map((pt) => {
                            const typeTotal = dailyReports.byDate.reduce((sum, dateReport) => {
                              const breakdown = dateReport.breakdown.find(b => b.paymentTypeId === pt.id);
                              return sum + (breakdown?.amount || 0);
                            }, 0);
                            return (
                              <TableCell key={pt.id} className="text-right">
                                {typeTotal > 0 ? formatCurrency(typeTotal) : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right">
                            {formatCurrency(dailyReports.summary.totalRevenue)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        </Tabs>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        `}</style>
      </div>
    );
  }

  // Owner View
  const ownerIsLoading = viewMode === 'monthly' ? monthlyLoading : dailyLoading;
  const ownerError = viewMode === 'monthly' ? monthlyError : dailyError;
  const ownerRefetchFn = viewMode === 'monthly' ? monthlyRefetch : dailyRefetch;

  if (ownerIsLoading) {
    return <LoadingState rows={5} columns={6} />;
  }

  if (ownerError) {
    return <ErrorState message="Failed to load reports" onRetry={() => ownerRefetchFn()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {viewMode === 'monthly' 
              ? 'Track student payment progress by month' 
              : 'Day-by-day payment tracking'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => ownerRefetchFn()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'monthly' | 'daily')}>
        <TabsList>
          <TabsTrigger value="monthly">
            <Users className="mr-2 h-4 w-4" />
            Monthly (Students)
          </TabsTrigger>
          <TabsTrigger value="daily">
            <DollarSign className="mr-2 h-4 w-4" />
            Daily (Money)
          </TabsTrigger>
        </TabsList>

        {/* Monthly View - Student Tracking */}
        <TabsContent value="monthly" className="space-y-6">
          {/* Revenue Cards for Monthly View */}
          {monthlyReports && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">
                        {formatCurrency(monthlyReports.summary.totalRevenue)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Monthly Revenue</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">
                        {formatCurrency(monthlyReports.summary.monthlyRevenue)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Payment Count</p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">
                        {monthlyReports.summary.paymentCount}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-indigo-200 bg-indigo-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-indigo-700">
                          {showPaidProgress ? 'Payment Progress' : 'Unpaid Progress'}
                        </p>
                        <button
                          onClick={() => setShowPaidProgress(!showPaidProgress)}
                          className="p-1 hover:bg-indigo-100 rounded transition-colors"
                          title={showPaidProgress ? 'Show unpaid students' : 'Show paid students'}
                        >
                          {showPaidProgress ? (
                            <UserX className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-indigo-600" />
                          )}
                        </button>
                      </div>
                      {showPaidProgress ? (
                        <>
                          <p className="text-2xl font-bold text-indigo-900 mt-1">
                            {monthlyReports.summary.paidStudents}/{monthlyReports.summary.totalStudents}
                          </p>
                          <div className="mt-2 w-full bg-indigo-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all"
                              style={{ width: `${monthlyReports.summary.paymentProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-indigo-600 mt-1">
                            {monthlyReports.summary.paymentProgress.toFixed(1)}% paid
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-indigo-900 mt-1">
                            {monthlyReports.summary.totalStudents - monthlyReports.summary.paidStudents}/{monthlyReports.summary.totalStudents}
                          </p>
                          <div className="mt-2 w-full bg-indigo-200 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full transition-all"
                              style={{ width: `${100 - monthlyReports.summary.paymentProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-indigo-600 mt-1">
                            {(100 - monthlyReports.summary.paymentProgress).toFixed(1)}% unpaid
                          </p>
                        </>
                      )}
                    </div>
                    {showPaidProgress ? (
                      <UserCheck className="h-8 w-8 text-indigo-600" />
                    ) : (
                      <UserX className="h-8 w-8 text-orange-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters for Monthly View */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Academic Year Filter */}
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Select
                    value={academicYearFilter}
                    onValueChange={setAcademicYearFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((year) => (
                        <SelectItem key={year.id} value={year.id}>
                          {year.name}
                          {activeYearData?.data?.id === year.id && ' (Active)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Type Filter */}
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Types</SelectItem>
                      {paymentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method Filter */}
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Methods</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Mobile Banking</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Registrar Filter (Owner only) */}
                <div className="space-y-2">
                  <Label>Registrar</Label>
                  <Select value={registrarFilter} onValueChange={setRegistrarFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select registrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Registrars</SelectItem>
                      {registrars.map((registrar) => (
                        <SelectItem key={registrar.id} value={registrar.id}>
                          {registrar.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Student Progress Table */}
          {!monthlyReports || monthlyReports.byMonth.length === 0 ? (
            <EmptyState
              title="No reports data"
              description="No payment data found for the selected filters"
            />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Monthly Student Payment Progress</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleMonthlyExport} 
                      disabled={!monthlyReports}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleMonthlyPrint} 
                      disabled={!monthlyReports}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Total Students</TableHead>
                        <TableHead className="text-right">Paid Students</TableHead>
                        <TableHead className="text-right">Unpaid Students</TableHead>
                        <TableHead className="text-right">Progress %</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyReports.byMonth.map((monthData) => {
                        const monthDate = new Date(monthData.month + '-01');
                        const progress = monthData.paymentProgress ?? 0;
                        const totalStudents = monthData.totalStudents ?? 0;
                        const paidStudents = monthData.paidStudents ?? 0;
                        const unpaidStudents = monthData.unpaidStudents ?? 0;
                        
                        const [year, month] = monthData.month.split('-');
                        return (
                          <TableRow key={monthData.month}>
                            <TableCell className="font-medium">
                              {formatMonthYear(monthData.month, parseInt(year), calendarSystem)}
                            </TableCell>
                            <TableCell className="text-right">{totalStudents}</TableCell>
                            <TableCell className="text-right text-green-600 font-semibold">
                              {paidStudents}
                            </TableCell>
                            <TableCell className="text-right text-orange-600 font-semibold">
                              {unpaidStudents}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-indigo-600 h-2 rounded-full"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{progress.toFixed(1)}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(monthData.totalAmount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Total Row */}
                      <TableRow className="bg-muted font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">
                          {monthlyReports.summary.totalStudents}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {monthlyReports.summary.paidStudents}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {monthlyReports.summary.totalStudents - monthlyReports.summary.paidStudents}
                        </TableCell>
                        <TableCell className="text-right">
                          {monthlyReports.summary.paymentProgress.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(monthlyReports.summary.totalRevenue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Daily View - Money Tracking */}
        <TabsContent value="daily" className="space-y-6">
          {/* Summary Cards for Daily View */}
          {dailyReports && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">
                        {formatCurrency(dailyReports.summary.totalRevenue)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Today's Revenue</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">
                        {formatCurrency(dailyReports.summary.todayRevenue)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {formatDate(new Date(), calendarSystem)}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Payment Count</p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">
                        {dailyReports.summary.paymentCount}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        Confirmed payments
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters for Daily View */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {/* Academic Year Filter */}
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Select
                    value={academicYearFilter}
                    onValueChange={setAcademicYearFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((year) => (
                        <SelectItem key={year.id} value={year.id}>
                          {year.name}
                          {activeYearData?.data?.id === year.id && ' (Active)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Type Filter */}
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Types</SelectItem>
                      {paymentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Month Filter */}
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select
                    value={monthFilter}
                    onValueChange={setMonthFilter}
                    disabled={monthOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {monthOptions.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method Filter */}
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Methods</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Mobile Banking</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Registrar Filter */}
                <div className="space-y-2">
                  <Label>Registrar</Label>
                  <Select value={registrarFilter} onValueChange={setRegistrarFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select registrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Registrars</SelectItem>
                      {registrars.map((registrar) => (
                        <SelectItem key={registrar.id} value={registrar.id}>
                          {registrar.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Day-by-Day Table for Owner Daily View */}
          {!dailyReports || dailyReports.byDate.length === 0 ? (
            <EmptyState
              title="No payment data"
              description="No payment data found for the selected filters"
            />
          ) : dailyTableData ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Day-by-Day Payment Tracking</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDailyExport} 
                      disabled={!dailyReports}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDailyPrint} 
                      disabled={!dailyReports}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10">Date</TableHead>
                        {dailyTableData.paymentTypes.map((pt) => (
                          <TableHead key={pt.id} className="text-right">
                            {pt.name}
                          </TableHead>
                        ))}
                        <TableHead className="text-right font-bold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyTableData.rows.map((row) => {
                        const date = new Date(row.date);
                        return (
                          <TableRow key={row.date}>
                            <TableCell className="sticky left-0 bg-background z-10 font-medium">
                              {formatDate(date, calendarSystem)}
                            </TableCell>
                            {dailyTableData.paymentTypes.map((pt) => {
                              const amount = row.paymentTypeData.get(pt.id) || 0;
                              return (
                                <TableCell key={pt.id} className="text-right">
                                  {amount > 0 ? formatCurrency(amount) : '-'}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right font-bold">
                              {formatCurrency(row.totalAmount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Total Row */}
                      <TableRow className="bg-muted font-bold">
                        <TableCell className="sticky left-0 bg-muted z-10">Total</TableCell>
                        {dailyTableData.paymentTypes.map((pt) => {
                          const typeTotal = dailyReports.byDate.reduce((sum, dateReport) => {
                            const breakdown = dateReport.breakdown.find(b => b.paymentTypeId === pt.id);
                            return sum + (breakdown?.amount || 0);
                          }, 0);
                          return (
                            <TableCell key={pt.id} className="text-right">
                              {typeTotal > 0 ? formatCurrency(typeTotal) : '-'}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right">
                          {formatCurrency(dailyReports.summary.totalRevenue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
