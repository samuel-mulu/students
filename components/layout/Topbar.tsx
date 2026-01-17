"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User as UserIcon, Calendar } from "lucide-react";
import { getInitials } from "@/lib/utils/format";
import { useCalendarSystem } from "@/lib/context/calendar-context";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { user, logout, isLoggingOut } = useAuth();
  const { calendarSystem, setCalendarSystem } = useCalendarSystem();

  if (!user || typeof user !== "object" || !("name" in user) || !user.name) {
    return (
      <div className="h-16 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex-1" />
        </div>
      </div>
    );
  }

  const currentUser = user as User;

  const toggleCalendarSystem = () => {
    setCalendarSystem(calendarSystem === "gregorian" ? "ethiopian" : "gregorian");
  };

  return (
    <div className="h-16 border-b bg-background sticky top-0 z-10">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          {/* Calendar Toggle Switch */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent transition-colors">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Calendar:</span>
            <button
              onClick={toggleCalendarSystem}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
                calendarSystem === "ethiopian" ? "bg-blue-600" : "bg-gray-300"
              )}
              aria-label={`Calendar system: ${calendarSystem}`}
              type="button"
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  calendarSystem === "ethiopian" ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
            <span className="text-sm font-medium min-w-[80px] text-right">
              {calendarSystem === "gregorian" ? "Gregorian" : "Ethiopian"}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {getInitials(currentUser.name, currentUser.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentUser.email}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {currentUser.role.toLowerCase()}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} disabled={isLoggingOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
