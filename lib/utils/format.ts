import {
  format,
  parseISO,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { formatDateForUI } from "./date";
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

export const formatMonthYear = (month: string, year: number): string => {
  try {
    const [yearPart, monthPart] = month.split("-");
    const date = new Date(parseInt(yearPart), parseInt(monthPart) - 1);
    return format(date, "MMMM yyyy");
  } catch {
    return `${month} ${year}`;
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
      label: format(month, "MMMM yyyy"),
    }));
  } catch {
    return [];
  }
};

/**
 * Generate all 12 months for a given year
 * Returns array of objects with { value: 'YYYY-MM', label: 'Month Year' }
 */
export const generateAllMonths = (year?: number): Array<{ value: string; label: string }> => {
  try {
    const targetYear = year || new Date().getFullYear();
    const months: Array<{ value: string; label: string }> = [];

    for (let month = 0; month < 12; month++) {
      const date = new Date(targetYear, month, 1);
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      });
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
