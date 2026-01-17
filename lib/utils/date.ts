import Kenat from "kenat";
import { format, parseISO } from "date-fns";

type CalendarSystem = "gregorian" | "ethiopian";

/**
 * Convert Gregorian ISO date string to Ethiopian date object
 */
export function gregorianToEthiopian(dateISO: string): { year: number; month: number; day: number } {
  try {
    const date = parseISO(dateISO);
    const kenat = new Kenat(date);
    const ethiopian = kenat.getEthiopian();
    return {
      year: ethiopian.year,
      month: ethiopian.month,
      day: ethiopian.day,
    };
  } catch (error) {
    console.error("Error converting Gregorian to Ethiopian:", error);
    // Fallback to current date if conversion fails
    const today = new Kenat();
    return today.getEthiopian();
  }
}

/**
 * Convert Ethiopian date to Gregorian ISO string (YYYY-MM-DD)
 */
export function ecToGregorianISO(ecYear: number, ecMonth: number, ecDay: number): string {
  try {
    // Validate inputs
    if (ecMonth < 1 || ecMonth > 13) {
      throw new Error(`Invalid Ethiopian month: ${ecMonth}`);
    }
    
    // Validate day based on month
    const maxDays = ecMonth === 13 ? 6 : 30; // Pagume has max 6 days, others have 30
    if (ecDay < 1 || ecDay > maxDays) {
      throw new Error(`Invalid day for month ${ecMonth}: ${ecDay}`);
    }

    // Create Ethiopian date string in format expected by kenat: "YYYY/MM/DD"
    const ethiopianDateStr = `${ecYear}/${ecMonth}/${ecDay}`;
    const kenat = new Kenat(ethiopianDateStr);
    
    // Get Gregorian date
    const gregorian = kenat.getGregorian();
    const date = new Date(gregorian.year, gregorian.month - 1, gregorian.day);
    
    // Format as YYYY-MM-DD
    return format(date, "yyyy-MM-dd");
  } catch (error) {
    console.error("Error converting Ethiopian to Gregorian:", error);
    // Fallback to today's date if conversion fails
    return format(new Date(), "yyyy-MM-dd");
  }
}

/**
 * Format date for UI display based on calendar system
 * If Gregorian: returns formatted date using date-fns
 * If Ethiopian: converts to Ethiopian and formats with weekday if possible
 */
export function formatDateForUI(dateISO: string, system: CalendarSystem): string {
  try {
    if (system === "gregorian") {
      const date = parseISO(dateISO);
      return format(date, "MMM dd, yyyy");
    } else {
      // Ethiopian calendar
      const kenat = new Kenat(parseISO(dateISO));
      // Format with weekday and full date in English
      return kenat.format({ lang: "english", showWeekday: true });
    }
  } catch (error) {
    console.error("Error formatting date for UI:", error);
    return dateISO;
  }
}

/**
 * Format date with weekday for Ethiopian calendar
 */
export function formatEthiopianDateWithWeekday(dateISO: string): string {
  try {
    const kenat = new Kenat(parseISO(dateISO));
    return kenat.format({ lang: "english", showWeekday: true });
  } catch (error) {
    console.error("Error formatting Ethiopian date:", error);
    return dateISO;
  }
}

/**
 * Get Ethiopian month names
 */
export function getEthiopianMonthName(month: number): string {
  const months = [
    "Meskerem",
    "Tikimt",
    "Hidar",
    "Tahsas",
    "Tir",
    "Yekatit",
    "Megabit",
    "Miazia",
    "Ginbot",
    "Sene",
    "Hamle",
    "Nehase",
    "Pagume",
  ];
  return months[month - 1] || `Month ${month}`;
}

/**
 * Check if Ethiopian year is a leap year (determines Pagume length)
 */
export function isEthiopianLeapYear(year: number): boolean {
  try {
    // Test by trying to create a date for Pagume 6
    const kenat = new Kenat(`${year}/13/6`);
    const ethDate = kenat.getEthiopian();
    // If we can create Pagume 6, it's a leap year
    return ethDate.month === 13 && ethDate.day === 6;
  } catch {
    return false;
  }
}
