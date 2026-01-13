'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatFullName } from '@/lib/utils/format';

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string;
  firstName: string;
  lastName: string;
}

export function ImageViewerDialog({
  open,
  onOpenChange,
  imageUrl,
  firstName,
  lastName,
}: ImageViewerDialogProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const fullName = formatFullName(firstName, lastName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{fullName}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center py-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={fullName}
              className="max-w-full max-h-[70vh] rounded-lg object-contain"
            />
          ) : (
            <Avatar className="h-48 w-48">
              <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold text-4xl">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
