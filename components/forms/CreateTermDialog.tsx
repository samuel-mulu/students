'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateTermRequest } from '@/lib/types';
import { useCreateTerm } from '@/lib/hooks/use-terms';
import { useAcademicYears } from '@/lib/hooks/use-academicYears';

interface CreateTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId?: string;
}

export function CreateTermDialog({ open, onOpenChange, academicYearId }: CreateTermDialogProps) {
  const createTerm = useCreateTerm();
  const { data: academicYearsData } = useAcademicYears();
  const academicYears = Array.isArray(academicYearsData?.data) ? academicYearsData.data : [];

  const [formData, setFormData] = useState({
    name: '',
    academicYearId: academicYearId || '',
    startDate: '',
    endDate: '',
  });

  // Reset form when dialog opens/closes or academicYearId changes
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        academicYearId: academicYearId || '',
        startDate: '',
        endDate: '',
      });
    }
  }, [open, academicYearId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.academicYearId || !formData.startDate) {
      return;
    }

    // Convert date strings to ISO datetime format for backend
    const startDateISO = new Date(formData.startDate + 'T00:00:00').toISOString();
    const endDateISO = formData.endDate ? new Date(formData.endDate + 'T00:00:00').toISOString() : undefined;

    const submitData: CreateTermRequest = {
      name: formData.name,
      academicYearId: formData.academicYearId,
      startDate: startDateISO,
      endDate: endDateISO,
    };

    try {
      await createTerm.mutateAsync(submitData);
      setFormData({ name: '', academicYearId: academicYearId || '', startDate: '', endDate: '' });
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Term</DialogTitle>
          <DialogDescription>
            Add a new term for the selected academic year (typically Term 1 or Term 2).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="academicYearId">Academic Year *</Label>
            <Select
              value={formData.academicYearId}
              onValueChange={(value) => setFormData({ ...formData, academicYearId: value })}
              disabled={!!academicYearId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an academic year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Term Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Term 1, Term 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date *</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date (Optional)</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTerm.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTerm.isPending || !formData.name || !formData.academicYearId || !formData.startDate}>
              {createTerm.isPending ? 'Creating...' : 'Create Term'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

