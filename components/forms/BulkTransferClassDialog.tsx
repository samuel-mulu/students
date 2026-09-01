'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Student, BulkTransferResult } from '@/lib/types';
import { useClasses } from '@/lib/hooks/use-classes';
import { formatFullName } from '@/lib/utils/format';
import { BulkTransferProgress } from '@/lib/hooks/use-students';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

const bulkTransferSchema = z.object({
  newClassId: z.string().min(1, 'Class is required'),
  reason: z.string().min(1, 'Reason is required'),
});

type BulkTransferFormData = z.infer<typeof bulkTransferSchema>;

interface BulkTransferClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  onConfirm: (newClassId: string, reason: string) => Promise<BulkTransferResult | void>;
  isLoading?: boolean;
  progress: BulkTransferProgress;
  lastResult?: BulkTransferResult | null;
  onRetryFailed?: (studentIds: string[], newClassId: string, reason: string) => Promise<void>;
}

function getCurrentClassName(student: Student): string {
  if ('classHistory' in student && Array.isArray(student.classHistory)) {
    const activeClass = student.classHistory.find((ch: { endDate?: string | null }) => !ch.endDate);
    if (activeClass && 'class' in activeClass && activeClass.class && typeof activeClass.class === 'object' && 'name' in activeClass.class) {
      return String(activeClass.class.name);
    }
  }
  return student.classStatus === 'assigned' ? 'Assigned' : 'New';
}

export function BulkTransferClassDialog({
  open,
  onOpenChange,
  students,
  onConfirm,
  isLoading,
  progress,
  lastResult,
  onRetryFailed,
}: BulkTransferClassDialogProps) {
  const { data: classesData } = useClasses();
  const classes = classesData?.data || [];
  const [savedForm, setSavedForm] = useState<BulkTransferFormData | null>(null);

  const classBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const student of students) {
      const name = getCurrentClassName(student);
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [students]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<BulkTransferFormData>({
    resolver: zodResolver(bulkTransferSchema),
  });

  const selectedClassId = watch('newClassId');
  const isTransferring = progress.phase === 'transferring';
  const isDone = progress.phase === 'done' && !!lastResult;
  const progressPercent =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const failedResults = lastResult?.results.filter((r) => !r.success) ?? [];

  const handleClose = (nextOpen: boolean) => {
    if (isTransferring) return;
    if (!nextOpen) {
      reset();
      setSavedForm(null);
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: BulkTransferFormData) => {
    setSavedForm(data);
    await onConfirm(data.newClassId, data.reason);
  };

  const handleRetryFailed = async () => {
    if (!savedForm || !onRetryFailed || failedResults.length === 0) return;
    await onRetryFailed(
      failedResults.map((r) => r.studentId),
      savedForm.newClassId,
      savedForm.reason,
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isDone ? 'Transfer Complete' : isTransferring ? 'Transferring Students' : 'Bulk Transfer Class'}
          </DialogTitle>
          <DialogDescription>
            {isDone
              ? `Processed ${lastResult?.total ?? 0} students`
              : isTransferring
                ? `Moving ${progress.current} of ${progress.total} students...`
                : `Transfer ${students.length} student${students.length !== 1 ? 's' : ''} to one class`}
          </DialogDescription>
        </DialogHeader>

        {isTransferring && (
          <div className="space-y-3 py-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {progress.current} / {progress.total} ({progressPercent}%)
            </p>
          </div>
        )}

        {isDone && lastResult && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">Succeeded</p>
                  <p className="text-lg font-bold text-green-700">{lastResult.succeeded}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3">
                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Failed</p>
                  <p className="text-lg font-bold text-red-700">{lastResult.failed}</p>
                </div>
              </div>
            </div>

            {failedResults.length > 0 && (
              <div className="rounded-md border max-h-40 overflow-y-auto">
                <div className="px-3 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                  Failed transfers
                </div>
                <ul className="divide-y">
                  {failedResults.map((item) => (
                    <li key={item.studentId} className="px-3 py-2 text-sm">
                      <span className="font-medium">{item.studentName || item.studentId}</span>
                      {item.error && (
                        <span className="text-muted-foreground"> — {item.error}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!isTransferring && !isDone && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <p className="text-sm font-medium">Selected students by current class</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {classBreakdown.map(([name, count]) => (
                  <li key={name}>
                    {name}: {count}
                  </li>
                ))}
              </ul>
              {students.length <= 5 && (
                <p className="text-xs text-muted-foreground pt-1 border-t">
                  {students.map((s) => formatFullName(s.firstName, s.lastName)).join(', ')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulkNewClassId">Destination Class *</Label>
              <Select
                value={selectedClassId}
                onValueChange={(value) => setValue('newClassId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.newClassId && (
                <p className="text-sm text-destructive">{errors.newClassId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulkReason">Reason *</Label>
              <Input
                id="bulkReason"
                {...register('reason')}
                placeholder="e.g., Section rebalancing, parent request"
              />
              {errors.reason && (
                <p className="text-sm text-destructive">{errors.reason.message}</p>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                This will close each student&apos;s current class assignment and create a new one in the destination class.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || students.length === 0}>
                Transfer {students.length} Student{students.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </form>
        )}

        {isDone && (
          <DialogFooter className="gap-2 sm:gap-0">
            {failedResults.length > 0 && onRetryFailed && savedForm && (
              <Button variant="outline" onClick={handleRetryFailed} disabled={isLoading}>
                Retry Failed ({failedResults.length})
              </Button>
            )}
            <Button onClick={() => handleClose(false)}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
