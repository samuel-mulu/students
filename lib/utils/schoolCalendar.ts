import { parseISO } from "date-fns";
import { getHolidaysForYear } from "kenat";
import { gregorianToEthiopian } from "./date";

type Holiday = {
  key: string;
  name: string;
  description?: string;
  tags?: string[];
  ethiopian: { year: number; month: number; day: number };
  gregorian: { year: number; month: number; day: number };
};

// Cache for holidays by Gregorian year
const holidayCache = new Map<number, Map<string, Holiday>>();

/**
 * Check if a date is a weekend
 */
export function isWeekend(dateISO: string, weekendDays: number[] = [0, 6]): boolean {
  try {
    const date = parseISO(dateISO);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    return weekendDays.includes(dayOfWeek);
  } catch (error) {
    console.error("Error checking weekend:", error);
    return false;
  }
}

/**
 * Get holidays for a specific Gregorian year
 * Caches holidays to avoid repeated calculations
 */
function getHolidaysForGregorianYear(year: number): Map<string, Holiday> {
  // Check cache first
  if (holidayCache.has(year)) {
    return holidayCache.get(year)!;
  }

  // Convert Gregorian year to Ethiopian year
  // Ethiopian year starts on Sept 11 (approximately)
  // So Gregorian year X corresponds roughly to Ethiopian year X - 7 or X - 8
  // We'll use the Ethiopian year that contains Jan 1 of the Gregorian year
  const jan1 = new Date(year, 0, 1);
  const ethiopian = gregorianToEthiopian(jan1.toISOString().split("T")[0]);
  const ethiopianYear = ethiopian.year;

  // Get holidays for the Ethiopian year
  const holidays = getHolidaysForYear(ethiopianYear);

  // Create a map: gregorianISO -> holiday
  const holidayMap = new Map<string, Holiday>();

  holidays.forEach((holiday) => {
    if (holiday.gregorian) {
      const gregorian = holiday.gregorian;
      const date = new Date(gregorian.year, gregorian.month - 1, gregorian.day);
      const isoDate = date.toISOString().split("T")[0]; // YYYY-MM-DD

      // Only include holidays that fall within the requested Gregorian year
      if (gregorian.year === year) {
        holidayMap.set(isoDate, holiday as Holiday);
      }
    }
  });

  // Cache the result
  holidayCache.set(year, holidayMap);

  return holidayMap;
}

/**
 * Check if a specific date is a holiday
 * Returns the holiday object if found, null otherwise
 */
export function holidayForDate(dateISO: string): Holiday | null {
  try {
    const date = parseISO(dateISO);
    const year = date.getFullYear();

    // Get holidays for the year
    const holidayMap = getHolidaysForGregorianYear(year);

    // Look up the date
    return holidayMap.get(dateISO) || null;
  } catch (error) {
    console.error("Error checking holiday:", error);
    return null;
  }
}

/**
 * Check if a date is a non-class day (weekend or holiday)
 * Returns object with status, reason, and holiday name if applicable
 */
export function isNoClassDay(
  dateISO: string,
  weekendDays: number[] = [0, 6]
): {
  isNoClass: boolean;
  reason?: string;
  holidayName?: string;
} {
  const isWeekendDay = isWeekend(dateISO, weekendDays);
  const holiday = holidayForDate(dateISO);

  if (isWeekendDay && holiday) {
    return {
      isNoClass: true,
      reason: "weekend-holiday",
      holidayName: holiday.name,
    };
  }

  if (isWeekendDay) {
    const date = parseISO(dateISO);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[date.getDay()];
    return {
      isNoClass: true,
      reason: "weekend",
      holidayName: dayName,
    };
  }

  if (holiday) {
    return {
      isNoClass: true,
      reason: "holiday",
      holidayName: holiday.name,
    };
  }

  return {
    isNoClass: false,
  };
}

/**
 * Clear the holiday cache (useful for testing or when needing fresh data)
 */
export function clearHolidayCache(): void {
  holidayCache.clear();
}
