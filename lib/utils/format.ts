import type { CalendarSystem } from "@/lib/context/calendar-context";
import {
    eachMonthOfInterval,
    endOfMonth,
    format,
    parseISO,
    startOfMonth,
} from "date-fns";
import { formatDateForUI, getEthiopianMonthNameAmharic, gregorianMonthToEthiopianMonth } from "./date";

/**
 * Format date for display
 * If calendarSystem is provided, respects Ethiopian/Gregorian calendar
 * Otherwise defaults to Gregorian format
 */
export const formatDate = (
  date: string | Date,
  calendarSystem?: CalendarSystem
): string => {
  try {
    const dateISO = typeof date === "string" ? date : format(date, "yyyy-MM-dd");
    
    // If calendar system is specified, use formatDateForUI
    if (calendarSystem) {
      return formatDateForUI(dateISO, calendarSystem);
    }
    
    // Default: Gregorian format using date-fns
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, "MMM dd, yyyy");
  } catch {
    return date.toString();
  }
};

export const formatDateTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, "MMM dd, yyyy HH:mm");
  } catch {
    return date.toString();
  }
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatMonthYear = (
  month: string,
  year: number,
  calendarSystem?: CalendarSystem,
  includeYear = false,
): string => {
  try {
    // Sentinel month for one-time Register Fee (YYYY-13)
    const sentinelMonthPart = month.split("-")[1];
    if (sentinelMonthPart === "13") {
      return "Register Fee";
    }

    const [yearPart, monthPart] = month.split("-");
    const displayYear = yearPart ? parseInt(yearPart, 10) : year;

    let monthLabel: string;
    if (calendarSystem === "ethiopian") {
      const ethiopianMonth = gregorianMonthToEthiopianMonth(month);
      monthLabel = getEthiopianMonthNameAmharic(ethiopianMonth);
    } else {
      const date = new Date(parseInt(yearPart, 10), parseInt(monthPart, 10) - 1);
      monthLabel = format(date, "MMMM");
    }

    return includeYear ? `${monthLabel} ${displayYear}` : monthLabel;
  } catch {
    // Fallback: try to extract month name from month string
    if (calendarSystem === "ethiopian") {
      try {
        const ethiopianMonth = gregorianMonthToEthiopianMonth(month);
        const monthLabel = getEthiopianMonthNameAmharic(ethiopianMonth);
        return includeYear ? `${monthLabel} ${year}` : monthLabel;
      } catch {
        return month;
      }
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = parseInt(month.split("-")[1]) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      const monthLabel = monthNames[monthIndex];
      return includeYear ? `${monthLabel} ${year}` : monthLabel;
    }
    return month;
  }
};

export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export const formatFullName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName}`;
};

/** Strip academic year suffix from class name for display, e.g. "KG 2 A (2025-2026)" → "KG 2 A" */
export const stripYearSuffix = (className: string): string =>
  className.replace(/\s*\(\d{4}-\d{4}\)\s*$/, "").trim();

/** Strip duplicate description suffix, e.g. "KG 1 A - KG 1 A" → "KG 1 A" */
export const stripClassDisplaySuffix = (className: string): string => {
  const base = stripYearSuffix(className);
  const idx = base.indexOf(" - ");
  return idx >= 0 ? base.slice(0, idx).trim() : base;
};

export const formatClassDisplayName = (className: string): string =>
  stripClassDisplaySuffix(className);

/** Active assignment first; in archive mode use year-scoped history from the API. */
export function resolveStudentClassEntry(
  classHistory:
    | Array<{ endDate?: string | null; class?: { name?: string; grade?: { name?: string } } }>
    | undefined,
  preferHistorical = false,
) {
  if (!classHistory?.length) return null;
  if (preferHistorical) {
    return classHistory[0];
  }
  return classHistory.find((ch) => !ch.endDate) ?? classHistory[0];
}

export function getStudentClassDisplayName(
  student: { classHistory?: Array<{ endDate?: string | null; class?: { name?: string } }>; classStatus?: string },
  preferHistorical = false,
): string {
  const entry = resolveStudentClassEntry(student.classHistory, preferHistorical);
  if (entry?.class?.name) {
    return formatClassDisplayName(entry.class.name);
  }
  return student.classStatus === "assigned" ? "Not Assigned" : "New";
}

/**
 * Generate months from academic year start date to end date
 * Returns array of objects with { value: 'YYYY-MM', label: 'Month Year' }
 */
export const generateMonthsFromAcademicYear = (
  startDate: string | Date,
  endDate: string | Date | null
): Array<{ value: string; label: string }> => {
  try {
    const start =
      typeof startDate === "string" ? parseISO(startDate) : startDate;
    const end = endDate
      ? typeof endDate === "string"
        ? parseISO(endDate)
        : endDate
      : new Date(); // Use current date if endDate is null

    const months = eachMonthOfInterval({
      start: startOfMonth(start),
      end: endOfMonth(end),
    });

    return months.map((month) => ({
      value: format(month, "yyyy-MM"),
      label: format(month, "MMMM"),
    }));
  } catch {
    return [];
  }
};

/**
 * Generate all 12 months for a given year
 * Returns array of objects with { value: 'YYYY-MM' (Gregorian), label: 'Month Name' }
 * If calendarSystem is Ethiopian, labels will be in Amharic and sorted starting from Meskerem (September)
 */
export const generateAllMonths = (year?: number, calendarSystem?: CalendarSystem): Array<{ value: string; label: string }> => {
  try {
    const targetYear = year || new Date().getFullYear();
    const months: Array<{ value: string; label: string }> = [];

    // Generate all 12 months in Gregorian order (January to December)
    for (let month = 0; month < 12; month++) {
      const date = new Date(targetYear, month, 1);
      const monthValue = format(date, "yyyy-MM");
      
      let label: string;
      if (calendarSystem === "ethiopian") {
        // Convert Gregorian month to Ethiopian month and get Amharic name
        const ethiopianMonth = gregorianMonthToEthiopianMonth(monthValue);
        label = getEthiopianMonthNameAmharic(ethiopianMonth);
      } else {
        // Gregorian calendar - use English month name
        label = format(date, "MMMM");
      }
      
      months.push({
        value: monthValue,
        label: label,
      });
    }

    // If Ethiopian calendar, reorder to start from Meskerem (September = month index 8)
    if (calendarSystem === "ethiopian") {
      // Ethiopian calendar starts from Meskerem (September)
      // Reorder: September (8), October (9), November (10), December (11), 
      //          January (0), February (1), March (2), April (3), May (4), 
      //          June (5), July (6), August (7)
      const reordered = [
        ...months.slice(8),  // September to December (indices 8-11)
        ...months.slice(0, 8), // January to August (indices 0-7)
      ];
      return reordered;
    }

    return months;
  } catch {
    return [];
  }
};

/**
 * Calendar year used for the 12-month fee picker (independent of academic year DB dates).
 * Prefers years from existing payment months in the bucket, then the start year from the
 * academic year name (e.g. "2019 - 2020" → 2019), then the current calendar year.
 */
export const getFeeCalendarYear = (
  academicYearName?: string | null,
  paymentMonths?: string[],
): number => {
  if (paymentMonths && paymentMonths.length > 0) {
    const years = paymentMonths
      .map((m) => parseInt(m.split("-")[0], 10))
      .filter((y) => !Number.isNaN(y));
    if (years.length > 0) {
      return Math.max(...years);
    }
  }

  if (academicYearName) {
    const normalized = academicYearName.replace(/\s/g, "");
    const range = normalized.match(/(\d{4})-(\d{4})/);
    if (range) {
      return parseInt(range[1], 10);
    }
    const single = normalized.match(/^(\d{4})$/);
    if (single) {
      return parseInt(single[1], 10);
    }
  }

  return new Date().getFullYear();
};

/** 12 fee months (Jan–Dec or Meskerem-first) with year in each label. */
export const generateFeeCalendarMonthOptions = (
  year: number,
  calendarSystem?: CalendarSystem,
): Array<{ value: string; label: string }> => {
  return generateAllMonths(year, calendarSystem).map((m) => {
    const y = parseInt(m.value.split("-")[0], 10);
    return {
      value: m.value,
      label: formatMonthYear(m.value, y, calendarSystem, true),
    };
  });
};

/**
 * Check if a student has a payment for a specific month within an academic year
 */
export const hasPaymentForMonth = (
  payments: Array<{
    month: string;
    year: number;
    status: string;
    academicYearId?: string | null;
  }>,
  month: string,
  year?: number,
  academicYearId?: string,
): { exists: boolean; status?: string } => {
  const [yearPart] = month.split("-");
  const paymentYear = year || parseInt(yearPart);

  const payment = payments.find((p) => {
    if (p.month !== month || p.year !== paymentYear) return false;
    if (academicYearId) {
      return p.academicYearId === academicYearId;
    }
    return true;
  });

  if (!payment) {
    return { exists: false };
  }

  return {
    exists: true,
    status: payment.status,
  };
};
