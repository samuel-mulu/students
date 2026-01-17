"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarSystem } from "@/lib/context/calendar-context";
import {
  gregorianToEthiopian,
  ecToGregorianISO,
  getEthiopianMonthName,
  isEthiopianLeapYear,
} from "@/lib/utils/date";

interface DateFieldProps {
  valueISO: string; // Gregorian ISO "YYYY-MM-DD"
  onChangeISO: (newISO: string) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function DateField({
  valueISO,
  onChangeISO,
  label,
  disabled = false,
  required = false,
  className = "",
}: DateFieldProps) {
  const { calendarSystem } = useCalendarSystem();
  const [ethiopianDate, setEthiopianDate] = useState<{
    year: number;
    month: number;
    day: number;
  }>({ year: 0, month: 1, day: 1 });

  // Convert Gregorian ISO to Ethiopian when valueISO or system changes
  useEffect(() => {
    if (calendarSystem === "ethiopian" && valueISO) {
      try {
        const eth = gregorianToEthiopian(valueISO);
        setEthiopianDate(eth);
      } catch (error) {
        console.error("Error converting to Ethiopian date:", error);
      }
    }
  }, [valueISO, calendarSystem]);

  // Get max days for Ethiopian month
  const getMaxDays = (month: number, year: number): number => {
    if (month === 13) {
      // Pagume: 5 or 6 days depending on leap year
      return isEthiopianLeapYear(year) ? 6 : 5;
    }
    return 30; // All other months have 30 days
  };

  // Handle Ethiopian date change
  const handleEthiopianChange = (
    field: "year" | "month" | "day",
    value: number
  ) => {
    const newDate = { ...ethiopianDate };

    if (field === "year") {
      newDate.year = value;
      // Adjust day if necessary (e.g., Pagume might change from 6 to 5 days)
      const maxDays = getMaxDays(newDate.month, newDate.year);
      if (newDate.day > maxDays) {
        newDate.day = maxDays;
      }
    } else if (field === "month") {
      newDate.month = value;
      // Adjust day if necessary (e.g., switching to Pagume)
      const maxDays = getMaxDays(newDate.month, newDate.year);
      if (newDate.day > maxDays) {
        newDate.day = maxDays;
      }
    } else {
      newDate.day = value;
    }

    setEthiopianDate(newDate);

    // Convert to Gregorian ISO and call onChangeISO
    try {
      const gregorianISO = ecToGregorianISO(
        newDate.year,
        newDate.month,
        newDate.day
      );
      onChangeISO(gregorianISO);
    } catch (error) {
      console.error("Error converting Ethiopian to Gregorian:", error);
    }
  };

  if (calendarSystem === "gregorian") {
    // Standard HTML date input for Gregorian
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <Label htmlFor="date-field" className={required ? "required" : ""}>
            {label}
          </Label>
        )}
        <Input
          id="date-field"
          type="date"
          value={valueISO || ""}
          onChange={(e) => onChangeISO(e.target.value)}
          disabled={disabled}
          required={required}
        />
      </div>
    );
  }

  // Ethiopian calendar: three separate inputs
  const maxDays = getMaxDays(ethiopianDate.month, ethiopianDate.year);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label className={required ? "required" : ""}>{label}</Label>
      )}
      <div className="grid grid-cols-3 gap-2">
        {/* Year input */}
        <div className="space-y-1">
          <Label htmlFor="ec-year" className="text-xs text-muted-foreground">
            Year
          </Label>
          <Input
            id="ec-year"
            type="number"
            value={ethiopianDate.year || ""}
            onChange={(e) => {
              const year = parseInt(e.target.value) || 0;
              if (year >= 1 && year <= 9999) {
                handleEthiopianChange("year", year);
              }
            }}
            disabled={disabled}
            required={required}
            min={1}
            max={9999}
            placeholder="Year"
          />
        </div>

        {/* Month select */}
        <div className="space-y-1">
          <Label htmlFor="ec-month" className="text-xs text-muted-foreground">
            Month
          </Label>
          <Select
            value={ethiopianDate.month?.toString() || "1"}
            onValueChange={(value) => {
              handleEthiopianChange("month", parseInt(value));
            }}
            disabled={disabled}
            required={required}
          >
            <SelectTrigger id="ec-month">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 13 }, (_, i) => i + 1).map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  {month}. {getEthiopianMonthName(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Day input */}
        <div className="space-y-1">
          <Label htmlFor="ec-day" className="text-xs text-muted-foreground">
            Day
          </Label>
          <Input
            id="ec-day"
            type="number"
            value={ethiopianDate.day || ""}
            onChange={(e) => {
              const day = parseInt(e.target.value) || 1;
              if (day >= 1 && day <= maxDays) {
                handleEthiopianChange("day", day);
              }
            }}
            disabled={disabled}
            required={required}
            min={1}
            max={maxDays}
            placeholder="Day"
          />
        </div>
      </div>
      {ethiopianDate.month === 13 && (
        <p className="text-xs text-muted-foreground">
          Pagume: {maxDays} days ({isEthiopianLeapYear(ethiopianDate.year) ? "leap year" : "regular year"})
        </p>
      )}
    </div>
  );
}
