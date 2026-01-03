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
import { LogOut, User as UserIcon } from "lucide-react";
import { getInitials } from "@/lib/utils/format";

export function Topbar() {
  const { user, logout, isLoggingOut } = useAuth();

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

  return (
    <div className="h-16 border-b bg-background sticky top-0 z-10">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex-1" />
        <div className="flex items-center gap-4">
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
