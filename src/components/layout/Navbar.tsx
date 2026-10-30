'use client';

import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { WorkspaceRole } from '@prisma/client';

interface NavbarProps {
  currentWorkspace: {
    id: string;
    name: string;
    currency: string;
  };
  workspaces: Array<{
    id: string;
    name: string;
    role: WorkspaceRole;
  }>;
  currentUser: {
    name: string;
    email: string;
    role: WorkspaceRole;
  };
}

export function Navbar({ currentWorkspace, workspaces, currentUser }: NavbarProps) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between shrink-0 relative z-40">
      <div className="flex items-center gap-4">
        <WorkspaceSwitcher
          currentWorkspace={currentWorkspace}
          workspaces={workspaces}
          currentUser={currentUser}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-xs font-semibold text-slate-200">{currentUser.name}</span>
          <span className="text-[11px] text-slate-400">{currentUser.email}</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)]">
          {currentUser.name.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
