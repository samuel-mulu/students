'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AcademicYear } from '@/lib/types';
import { Users, GraduationCap, FileText, DollarSign, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface ArchivedYearsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  archivedYears: AcademicYear[];
}

export function ArchivedYearsModal({
  open,
  onOpenChange,
  archivedYears,
}: ArchivedYearsModalProps) {
  const handleViewAction = (yearId: string, viewType: string) => {
    // Close modal first
    onOpenChange(false);
    
    // Navigate to appropriate page with academic year filter
    // The pages will need to handle the academicYearId query param
    const basePaths: Record<string, string> = {
      classes: '/dashboard/classes',
      students: '/dashboard/students',
      marks: '/dashboard/results',
      payments: '/dashboard/payments',
    };
    
    const path = basePaths[viewType];
    if (path) {
      // Use window.location to add query param
      window.location.href = `${path}?academicYearId=${yearId}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Archived Academic Years</DialogTitle>
          <DialogDescription>
            View data from archived academic years. All views are read-only.
          </DialogDescription>
        </DialogHeader>

        {archivedYears.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No archived academic years</p>
          </div>
        ) : (
          <div className="space-y-4">
            {archivedYears.map((year) => (
              <div
                key={year.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">{year.name}</h3>
                    <Badge variant="secondary">CLOSED</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAction(year.id, 'classes')}
                    className="justify-start"
                  >
                    <GraduationCap className="mr-2 h-4 w-4" />
                    View Classes
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAction(year.id, 'students')}
                    className="justify-start"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    View Students
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAction(year.id, 'marks')}
                    className="justify-start"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Results
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAction(year.id, 'payments')}
                    className="justify-start"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    View Payments
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
