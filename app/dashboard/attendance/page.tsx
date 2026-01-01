'use client';

import { useState } from 'react';
import { useClasses } from '@/lib/hooks/use-classes';
import { useStudents } from '@/lib/hooks/use-students';
import { useBulkAttendance } from '@/lib/hooks/use-attendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AttendanceStatus } from '@/lib/types';
import { formatFullName } from '@/lib/utils/format';
import { useRouter } from 'next/navigation';

export default function AttendancePage() {
  const router = useRouter();
  const { data: classesData } = useClasses();
  const classes = Array.isArray(classesData?.data) ? classesData.data : [];
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const handleContinue = () => {
    if (selectedClassId && selectedDate) {
      router.push(`/dashboard/attendance/${selectedClassId}?date=${selectedDate}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Attendance</h1>
        <p className="text-body text-muted-foreground mt-1">
          Mark attendance for a class on a specific date
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Class and Date</CardTitle>
          <CardDescription>Choose a class and date to mark attendance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="class">Class *</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleContinue} disabled={!selectedClassId || !selectedDate}>
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

