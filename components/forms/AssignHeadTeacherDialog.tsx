'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { User, Class } from '@/lib/types';
import { useActiveAcademicYear } from '@/lib/hooks/use-academicYears';

interface AssignHeadTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  classes: Class[];
  onConfirm: (classId: string) => Promise<void>;
  isLoading?: boolean;
}

export function AssignHeadTeacherDialog({
  open,
  onOpenChange,
  user,
  classes,
  onConfirm,
  isLoading,
}: AssignHeadTeacherDialogProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const { data: activeYearData } = useActiveAcademicYear();
  const activeYear = activeYearData?.data;

  const handleSubmit = async () => {
    if (selectedClassId) {
      await onConfirm(selectedClassId);
      setSelectedClassId('');
      onOpenChange(false);
    }
  };

  // Filter classes by active academic year
  const activeYearClasses = useMemo(() => {
    if (!activeYear) return [];
    return classes.filter((cls) => cls.academicYearId === activeYear.id);
  }, [classes, activeYear]);

  // Filter out classes already assigned to this teacher
  const availableClasses = useMemo(() => {
    return activeYearClasses.filter((cls) => {
    if (!user?.teacherClasses) return true;
    return !user.teacherClasses.some((tc) => tc.id === cls.id);
  });
  }, [activeYearClasses, user?.teacherClasses]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Head Teacher</DialogTitle>
          <DialogDescription>
            Assign {user?.name || 'this teacher'} as head teacher to a class
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class">Class *</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {!activeYear ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No active academic year found. Please activate an academic year first.
                  </div>
                ) : availableClasses.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {activeYearClasses.length === 0
                      ? `No classes found in active academic year (${activeYear.name})`
                      : 'No available classes (all classes are already assigned to this teacher)'}
                  </div>
                ) : (
                  availableClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {user?.teacherClasses && user.teacherClasses.length > 0 && activeYear && (
              <p className="text-xs text-muted-foreground mt-1">
                Currently assigned to (active academic year):{' '}
                {user.teacherClasses
                  .filter((tc) => {
                    const classData = classes.find((c) => c.id === tc.id);
                    return classData?.academicYearId === activeYear.id;
                  })
                  .map((c) => c.name)
                  .join(', ') || 'None'}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedClassId || isLoading}
          >
            {isLoading ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

