import {
  format,
  parseISO,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { formatDateForUI, getEthiopianMonthNameAmharic, gregorianMonthToEthiopianMonth } from "./date";
import type { CalendarSystem } from "@/lib/context/calendar-context";

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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export const formatMonthYear = (month: string, year: number, calendarSystem?: CalendarSystem): string => {
  try {
    // Sentinel month for one-time Register Fee (YYYY-13)
    const sentinelMonthPart = month.split("-")[1];
    if (sentinelMonthPart === "13") {
      return "Register Fee";
    }

    if (calendarSystem === "ethiopian") {
      // Convert Gregorian month to Ethiopian month and return Amharic name
      const ethiopianMonth = gregorianMonthToEthiopianMonth(month);
      return getEthiopianMonthNameAmharic(ethiopianMonth);
    }
    
    // Gregorian calendar - return English month name
    const [yearPart, monthPart] = month.split("-");
    const date = new Date(parseInt(yearPart), parseInt(monthPart) - 1);
    return format(date, "MMMM");
  } catch {
    // Fallback: try to extract month name from month string
    if (calendarSystem === "ethiopian") {
      // Try to get Ethiopian month even in error case
      try {
        const ethiopianMonth = gregorianMonthToEthiopianMonth(month);
        return getEthiopianMonthNameAmharic(ethiopianMonth);
      } catch {
        return month;
      }
    }
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = parseInt(month.split("-")[1]) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return monthNames[monthIndex];
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
 * Check if a student has a payment for a specific month
 */
export const hasPaymentForMonth = (
  payments: Array<{ month: string; year: number; status: string }>,
  month: string,
  year?: number
): { exists: boolean; status?: string } => {
  const [yearPart, monthPart] = month.split("-");
  const paymentYear = year || parseInt(yearPart);

  const payment = payments.find(
    (p) => p.month === month && p.year === paymentYear
  );

  if (!payment) {
    return { exists: false };
  }

  return {
    exists: true,
    status: payment.status,
  };
};
