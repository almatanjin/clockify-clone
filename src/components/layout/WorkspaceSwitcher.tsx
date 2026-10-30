'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { switchWorkspaceAction, logoutAction } from '@/app/actions/auth';
import { createWorkspaceAction } from '@/app/actions/workspace';
import { Building2, ChevronDown, Check, Plus, X, LogOut, Shield, Briefcase, User } from 'lucide-react';
import { WorkspaceRole } from '@prisma/client';

interface WorkspaceItem {
  id: string;
  name: string;
  role: WorkspaceRole;
}

interface WorkspaceSwitcherProps {
  currentWorkspace: {
    id: string;
    name: string;
    currency: string;
  };
  workspaces: WorkspaceItem[];
  currentUser: {
    name: string;
    email: string;
    role: WorkspaceRole;
  };
}

export function WorkspaceSwitcher({
  currentWorkspace,
  workspaces,
  currentUser,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSwitch(workspaceId: string) {
    if (workspaceId === currentWorkspace.id) {
      setIsOpen(false);
      return;
    }
    setLoading(true);
    await switchWorkspaceAction(workspaceId);
    setIsOpen(false);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setLoading(true);
    const formData = new FormData();
    formData.set('name', newWorkspaceName);
    const result = await createWorkspaceAction(formData);
    setLoading(false);
    if (result.success) {
      setShowCreateModal(false);
      setNewWorkspaceName('');
      setIsOpen(false);
    }
  }

  const roleBadge = (role: WorkspaceRole) => {
    switch (role) {
      case WorkspaceRole.ADMIN:
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Shield className="w-2.5 h-2.5" /> Admin
          </span>
        );
      case WorkspaceRole.MANAGER:
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Briefcase className="w-2.5 h-2.5" /> Manager
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300">
            <User className="w-2.5 h-2.5" /> Member
          </span>
        );
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all"
      >
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="flex flex-col min-w-0 pr-1">
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">
            {currentWorkspace.name}
          </span>
          <div className="flex items-center gap-1.5">
            {roleBadge(currentUser.role)}
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 border-b border-slate-800 mb-1">
              <p className="text-xs font-medium text-slate-400">Current User</p>
              <p className="text-sm font-semibold text-slate-100 truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
            </div>

            <div className="py-1">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Workspaces
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitch(ws.id)}
                    disabled={loading}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      ws.id === currentWorkspace.id
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{ws.name}</span>
                    </div>
                    {ws.id === currentWorkspace.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-1 mt-1 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => logoutAction()}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/80 backdrop-blur-sm">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  New Workspace
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newWorkspaceName.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Creating...' : 'Create Workspace'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
