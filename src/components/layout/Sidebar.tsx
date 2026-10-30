'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Clock,
  CalendarDays,
  FolderKanban,
  Users2,
  Tags,
  BarChart3,
  Users,
  Settings,
} from 'lucide-react';
import { WorkspaceRole } from '@prisma/client';

interface SidebarProps {
  role: WorkspaceRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Time Tracker', href: '/tracker', icon: Clock },
    { label: 'Timesheet (Weekly)', href: '/timesheet', icon: CalendarDays },
    { label: 'Projects', href: '/projects', icon: FolderKanban },
    { label: 'Clients', href: '/clients', icon: Users2 },
    { label: 'Tags', href: '/tags', icon: Tags },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Team', href: '/team', icon: Users },
  ];

  if (role === WorkspaceRole.ADMIN) {
    navItems.push({ label: 'Settings', href: '/settings', icon: Settings });
  }

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/80 backdrop-blur-md flex flex-col shrink-0 min-h-screen">
      {/* Brand header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
        <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
          <Clock className="w-5 h-5" />
        </div>
        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
          Clockify
        </span>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Manage Time
        </div>
        {navItems.slice(0, 2).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="px-3 pt-5 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Organization
        </div>
        {navItems.slice(2).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Clockify Self-Hosted</span>
        <span className="font-mono text-cyan-500/80">v1.0</span>
      </div>
    </aside>
  );
}
