'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePaymentReports } from '@/lib/hooks/use-reports';
import { useAcademicYears, useActiveAcademicYear } from '@/lib/hooks/use-academicYears';
import { usePaymentTypes } from '@/lib/hooks/use-payment-types';
import { useUsers } from '@/lib/hooks/use-users';
import { useAuthStore } from '@/lib/store/auth-store';
import { generateAllMonths } from '@/lib/utils/format';
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
import { DollarSign, TrendingUp, FileText, Download, Printer, RefreshCw, Users, UserCheck, UserX, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const isOwner = user?.role === 'OWNER';
  const isRegistrar = user?.role === 'REGISTRAR';

  // Filters state
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [registrarFilter, setRegistrarFilter] = useState<string>('all');
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
    return generateAllMonths(new Date().getFullYear());
  }, []);

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

  // Build API params
  const reportParams = useMemo(() => {
    const params: any = {};
    if (academicYearFilter) {
      params.academicYearId = academicYearFilter;
    }
    if (paymentTypeFilter && paymentTypeFilter !== 'all') {
      params.paymentTypeId = paymentTypeFilter;
    }
    if (monthFilter && monthFilter !== 'all') {
      params.month = monthFilter;
    }
    if (isOwner && registrarFilter && registrarFilter !== 'all') {
      params.registrarId = registrarFilter;
    }
    return params;
  }, [academicYearFilter, paymentTypeFilter, monthFilter, registrarFilter, isOwner]);

  // Fetch reports data
  const { data: reportsData, isLoading, error, refetch } = usePaymentReports(reportParams);
  const reports = reportsData?.data;

  // Process data for table - show selected month or all months
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

  // Export to CSV
  const handleExport = () => {
    if (!tableData || !reports) return;

    const headers = ['Payment Type', ...tableData.months.map(m => {
      const [yearPart, monthPart] = m.split('-');
      const date = new Date(parseInt(yearPart), parseInt(monthPart) - 1);
      return format(date, 'MMMM yyyy');
    }), 'Total'];
    
    // If only one month is selected, adjust the table structure
    if (tableData.months.length === 1) {
      // For single month view, we can simplify the export
    }
    const rows = tableData.rows.map(row => [
      row.paymentTypeName,
      ...tableData.months.map(month => {
        const amount = row.monthlyData.get(month) || 0;
        return amount.toFixed(2);
      }),
      row.total.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '', // Empty row
      'Summary',
      `Total Revenue,${reports.summary.totalRevenue.toFixed(2)}`,
      `Monthly Revenue,${reports.summary.monthlyRevenue.toFixed(2)}`,
      `Pending Amount,${reports.summary.pendingAmount.toFixed(2)}`,
      `Payment Count,${reports.summary.paymentCount}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <LoadingState rows={5} columns={6} />;
  }

  if (error) {
    return <ErrorState message="Failed to load reports" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View payment revenue by payment type and month
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!reports}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={!reports}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Revenue Cards */}
      {reports && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {formatCurrency(reports.summary.totalRevenue)}
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
                    {formatCurrency(reports.summary.monthlyRevenue)}
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
                    {reports.summary.paymentCount}
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
                        {reports.summary.paidStudents}/{reports.summary.totalStudents}
                      </p>
                      <div className="mt-2 w-full bg-indigo-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${reports.summary.paymentProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-indigo-600 mt-1">
                        {reports.summary.paymentProgress.toFixed(1)}% paid
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-indigo-900 mt-1">
                        {reports.summary.totalStudents - reports.summary.paidStudents}/{reports.summary.totalStudents}
                      </p>
                      <div className="mt-2 w-full bg-indigo-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all"
                          style={{ width: `${100 - reports.summary.paymentProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-indigo-600 mt-1">
                        {(100 - reports.summary.paymentProgress).toFixed(1)}% unpaid
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Academic Year Filter */}
            {isRegistrar ? (
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input
                  value={activeYearData?.data?.name || 'Loading...'}
                  disabled
                  className="bg-muted text-sm h-9"
                />
              </div>
            ) : (
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
            )}

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

            {/* Registrar Filter (Owner only) */}
            {isOwner && (
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      {!reports || reports.byPaymentType.length === 0 ? (
        <EmptyState
          title="No reports data"
          description="No payment data found for the selected filters"
        />
      ) : tableData ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Revenue by Payment Type{monthFilter && monthFilter !== 'all' ? ` - ${format(new Date(monthFilter + '-01'), 'MMMM yyyy')}` : ' and Month'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Payment Type</TableHead>
                    {tableData.months.map((month) => {
                      const [yearPart, monthPart] = month.split('-');
                      const date = new Date(parseInt(yearPart), parseInt(monthPart) - 1);
                      return (
                        <TableHead key={month} className="text-right">
                          {format(date, 'MMM yyyy')}
                        </TableHead>
                      );
                    })}
                    {monthFilter === 'all' && <TableHead className="text-right font-bold">Total</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.rows.map((row) => (
                    <TableRow key={row.paymentTypeId}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {row.paymentTypeName}
                      </TableCell>
                      {tableData.months.map((month) => {
                        const amount = row.monthlyData.get(month) || 0;
                        return (
                          <TableCell key={month} className="text-right">
                            {amount > 0 ? formatCurrency(amount) : '-'}
                          </TableCell>
                        );
                      })}
                      {monthFilter === 'all' && (
                        <TableCell className="text-right font-bold">
                          {formatCurrency(row.total)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  {monthFilter === 'all' && (
                    <TableRow className="bg-muted font-bold">
                      <TableCell className="sticky left-0 bg-muted z-10">Total</TableCell>
                      {tableData.months.map((month) => {
                        const monthTotal = reports.byMonth?.find(m => m.month === month)?.totalAmount || 0;
                        return (
                          <TableCell key={month} className="text-right">
                            {monthTotal > 0 ? formatCurrency(monthTotal) : '-'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        {formatCurrency(reports.summary.totalRevenue)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
