'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { cn } from '@/lib/utils';
import {
  Users,
  GraduationCap,
  Calendar,
  FileText,
  DollarSign,
  BarChart3,
  LayoutDashboard,
} from 'lucide-react';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ('REGISTRAR' | 'OWNER' | 'TEACHER')[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['OWNER', 'REGISTRAR', 'TEACHER'],
  },
  {
    label: 'Students',
    href: '/dashboard/students',
    icon: Users,
    roles: ['OWNER', 'REGISTRAR'],
  },
  {
    label: 'Classes',
    href: '/dashboard/classes',
    icon: GraduationCap,
    roles: ['OWNER', 'REGISTRAR'],
  },
  {
    label: 'Attendance',
    href: '/dashboard/attendance',
    icon: Calendar,
    roles: ['OWNER', 'TEACHER'],
  },
  {
    label: 'Marks',
    href: '/dashboard/marks',
    icon: FileText,
    roles: ['OWNER', 'TEACHER'],
  },
  {
    label: 'Payments',
    href: '/dashboard/payments',
    icon: DollarSign,
    roles: ['OWNER', 'REGISTRAR'],
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: ['OWNER', 'REGISTRAR'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasRole } = useAuthStore();

  // Wait for user to be available
  if (!user) {
    return (
      <div className="w-64 border-r bg-sidebar h-screen sticky top-0">
        <div className="p-6 border-b">
          <h1 className="text-lg font-semibold">School System</h1>
        </div>
      </div>
    );
  }

  // Filter menu items based on user role
  const visibleItems = menuItems.filter((item) => hasRole(item.roles));

  return (
    <div className="w-64 border-r bg-sidebar h-screen sticky top-0">
      <div className="p-6 border-b">
        <h1 className="text-lg font-semibold">School System</h1>
      </div>
      <nav className="p-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

