"use client";

import { Archive } from "lucide-react";
import { useAcademicYearContext } from "@/lib/hooks/use-academic-year-context";

export function ArchiveModeBanner() {
  const { isArchiveMode, selectedYear } = useAcademicYearContext();

  if (!isArchiveMode || !selectedYear) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Archive className="h-4 w-4 shrink-0" />
      <span>
        Viewing archived year <strong>{selectedYear.name}</strong>. Read-only.
      </span>
    </div>
  );
}
