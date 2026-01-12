'use client';

import { useState } from 'react';
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

  const handleSubmit = async () => {
    if (selectedClassId) {
      await onConfirm(selectedClassId);
      setSelectedClassId('');
      onOpenChange(false);
    }
  };

  // Filter out classes already assigned to this teacher
  const availableClasses = classes.filter((cls) => {
    if (!user?.teacherClasses) return true;
    return !user.teacherClasses.some((tc) => tc.id === cls.id);
  });

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
                {availableClasses.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No available classes
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
            {user?.teacherClasses && user.teacherClasses.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Currently assigned to: {user.teacherClasses.map((c) => c.name).join(', ')}
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

