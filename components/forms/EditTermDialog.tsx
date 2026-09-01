'use client';

import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Term } from '@/lib/types';
import { useUpdateTerm } from '@/lib/hooks/use-terms';

const TERM_PRESETS = ['Term 1', 'Term 2'] as const;

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

interface EditTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  term: Term | null;
}

export function EditTermDialog({ open, onOpenChange, term }: EditTermDialogProps) {
  const updateTerm = useUpdateTerm();
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (open && term) {
      setFormData({
        name: term.name,
        startDate: toDateInputValue(term.startDate),
        endDate: toDateInputValue(term.endDate),
      });
    }
  }, [open, term]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term || !formData.name || !formData.startDate) {
      return;
    }

    const startDateISO = new Date(formData.startDate + 'T00:00:00').toISOString();
    const endDateISO = formData.endDate
      ? new Date(formData.endDate + 'T00:00:00').toISOString()
      : null;

    try {
      await updateTerm.mutateAsync({
        id: term.id,
        data: {
          name: formData.name.trim(),
          startDate: startDateISO,
          endDate: endDateISO,
        },
      });
      onOpenChange(false);
    } catch {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Term</DialogTitle>
          <DialogDescription>
            Update the term name or dates. Existing marks stay linked to this term — nothing is
            deleted. Use &quot;Term 1&quot; and &quot;Term 2&quot; for promotion and results.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-term-name">Term Name *</Label>
            <Select
              value={TERM_PRESETS.includes(formData.name as (typeof TERM_PRESETS)[number]) ? formData.name : 'custom'}
              onValueChange={(value) => {
                if (value !== 'custom') {
                  setFormData({ ...formData, name: value });
                }
              }}
            >
              <SelectTrigger id="edit-term-preset">
                <SelectValue placeholder="Choose preset or custom below" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="custom">Custom name</SelectItem>
              </SelectContent>
            </Select>
            <Input
              id="edit-term-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Term 1, Term 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-term-start">Start Date *</Label>
            <Input
              id="edit-term-start"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-term-end">End Date (Optional)</Label>
            <Input
              id="edit-term-end"
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
              disabled={updateTerm.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                updateTerm.isPending || !formData.name.trim() || !formData.startDate
              }
            >
              {updateTerm.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
