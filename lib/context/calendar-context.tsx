"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type CalendarSystem = "gregorian" | "ethiopian";

interface CalendarContextType {
  calendarSystem: CalendarSystem;
  setCalendarSystem: (system: CalendarSystem) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const STORAGE_KEY = "calendarSystem";

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [calendarSystem, setCalendarSystemState] = useState<CalendarSystem>("gregorian");
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "gregorian" || stored === "ethiopian") {
        setCalendarSystemState(stored);
      }
    } catch (error) {
      console.error("Failed to load calendar system from localStorage:", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const setCalendarSystem = (system: CalendarSystem) => {
    try {
      localStorage.setItem(STORAGE_KEY, system);
      setCalendarSystemState(system);
    } catch (error) {
      console.error("Failed to save calendar system to localStorage:", error);
    }
  };

  // Prevent hydration mismatch by not rendering until localStorage is read
  if (!isHydrated) {
    return <>{children}</>;
  }

  return (
    <CalendarContext.Provider value={{ calendarSystem, setCalendarSystem }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarSystem() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error("useCalendarSystem must be used within a CalendarProvider");
  }
  return context;
}
