"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAcademicYears, useActiveAcademicYear } from "./use-academicYears";

export function useAcademicYearContext() {
  const searchParams = useSearchParams();
  const academicYearIdParam = searchParams.get("academicYearId") || undefined;

  const { data: activeYearData } = useActiveAcademicYear();
  const { data: academicYearsData } = useAcademicYears();

  const activeYear = activeYearData?.data;
  const academicYears = Array.isArray(academicYearsData?.data)
    ? academicYearsData.data
    : [];

  const selectedYearId = academicYearIdParam || activeYear?.id;
  const selectedYear =
    academicYears.find((y) => y.id === selectedYearId) || activeYear;

  const isArchiveMode = Boolean(
    academicYearIdParam &&
      activeYear?.id &&
      academicYearIdParam !== activeYear.id,
  );

  const isReadOnly =
    isArchiveMode || selectedYear?.status === "CLOSED";

  return useMemo(
    () => ({
      academicYearId: selectedYearId,
      academicYearIdParam,
      selectedYear,
      activeYear,
      academicYears,
      isArchiveMode,
      isReadOnly,
    }),
    [
      selectedYearId,
      academicYearIdParam,
      selectedYear,
      activeYear,
      academicYears,
      isArchiveMode,
      isReadOnly,
    ],
  );
}
