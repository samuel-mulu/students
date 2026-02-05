"use client";

import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";
import {
    ArrowUpCircle,
    BarChart3,
    Calendar,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    FileText,
    GraduationCap,
    LayoutDashboard,
    School,
    Settings,
    UserCog,
    Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ("REGISTRAR" | "OWNER" | "TEACHER")[];
}

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["OWNER", "TEACHER"],
  },
  {
    label: "Students",
    href: "/dashboard/students",
    icon: Users,
    roles: ["OWNER", "REGISTRAR"],
  },
  {
    label: "Grades",
    href: "/dashboard/grades",
    icon: GraduationCap,
    roles: ["OWNER"],
  },
  {
    label: "Attendance",
    href: "/dashboard/attendance",
    icon: Calendar,
    roles: ["OWNER", "TEACHER"],
  },
  {
    label: "Results",
    href: "/dashboard/results",
    icon: FileText,
    roles: ["OWNER", "TEACHER"],
  },
  {
    label: "Payments",
    href: "/dashboard/payments",
    icon: DollarSign,
    roles: ["OWNER", "REGISTRAR"],
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: ["OWNER", "REGISTRAR"],
  },
  {
    label: "Users & Teachers",
    href: "/dashboard/users",
    icon: UserCog,
    roles: ["OWNER"],
  },
  {
    label: "Academic Years",
    href: "/dashboard/academic-years",
    icon: School,
    roles: ["OWNER"],
  },
  {
    label: "Promotion",
    href: "/dashboard/promotion",
    icon: ArrowUpCircle,
    roles: ["OWNER"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["OWNER"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasRole } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Wait for user to be available
  if (!user) {
    return (
      <div
        className={cn(
          "border-r bg-sidebar h-screen sticky top-0 transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <div className="p-6 border-b">
          <div className="flex flex-col items-center gap-3 w-full">
            <img
              src="/logo.jpg"
              alt="Digital KG Logo"
              className={cn(
                "transition-all duration-300",
                isCollapsed ? "w-10 h-10" : "w-16 h-16",
              )}
            />
            <span
              className={cn(
                "text-lg font-bold text-center transition-opacity",
                isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100",
              )}
            >
              DIGITAL KG
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Filter menu items based on user role
  const visibleItems = menuItems.filter((item) => hasRole(item.roles));

  return (
    <div
      className={cn(
        "border-r bg-sidebar h-screen sticky top-0 transition-all duration-300 flex flex-col",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="p-6 border-b flex items-center justify-between">
        <div className="flex flex-col items-center gap-3 w-full">
          <img
            src="/logo.jpg"
            alt="Digital KG Logo"
            className={cn(
              "transition-all duration-300",
              isCollapsed ? "w-10 h-10" : "w-16 h-16",
            )}
          />
          <span
            className={cn(
              "text-lg font-bold text-center transition-opacity",
              isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100",
            )}
          >
            DIGITAL KG
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "p-1.5 rounded-md hover:bg-sidebar-accent transition-colors",
            isCollapsed && "mx-auto",
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isCollapsed && "justify-center",
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span
                className={cn(
                  "transition-opacity",
                  isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
