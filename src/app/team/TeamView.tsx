'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  inviteMemberAction,
  updateMemberRoleOrRateAction,
  removeMemberAction,
} from '@/app/actions/workspace';
import { CurrencyIcon, getCurrencySymbol } from '@/components/ui/CurrencyIcon';
import { WorkspaceRole, InvitationStatus } from '@prisma/client';
import {
  Users,
  UserPlus,
  Shield,
  Briefcase,
  User as UserIcon,
  Trash2,
  Mail,
  X,
  Clock,
  Check,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface MemberItem {
  id: string;
  userId: string;
  role: WorkspaceRole;
  hourlyRate: number | null;
  joinedAt: Date | string;
  user: {
    name: string;
    email: string;
  };
}

interface InvitationItem {
  id: string;
  email: string;
  role: WorkspaceRole;
  hourlyRate: number | null;
  token: string;
  status: InvitationStatus;
  expiresAt: Date | string;
}

interface TeamViewProps {
  members: MemberItem[];
  invitations: InvitationItem[];
  currentUserId: string;
  currentUserRole: WorkspaceRole;
  currency: string;
}

interface MemberOverride {
  role?: WorkspaceRole;
  hourlyRate?: string;
}

export function TeamView({
  members,
  invitations,
  currentUserId,
  currentUserRole,
  currency,
}: TeamViewProps) {
  const router = useRouter();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Track per-member changes
  const [overrides, setOverrides] = useState<Record<string, MemberOverride>>({});
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [savedMemberId, setSavedMemberId] = useState<string | null>(null);

  const isAdmin = currentUserRole === WorkspaceRole.ADMIN;

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await inviteMemberAction(formData);
    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else if (res?.success) {
      setMessage(res.message || 'Invitation sent successfully!');
      setShowInviteModal(false);
    }
  }

  async function handleSave(memberId: string) {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const currentRole = overrides[memberId]?.role ?? member.role;
    const initialRate =
      member.hourlyRate !== null ? (member.hourlyRate / 100).toFixed(2) : '';
    const currentRate = overrides[memberId]?.hourlyRate ?? initialRate;

    setSavingMemberId(memberId);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set('memberId', memberId);
    formData.set('role', currentRole);
    formData.set('hourlyRate', currentRate);

    const res = await updateMemberRoleOrRateAction(formData);
    setSavingMemberId(null);

    if (res?.error) {
      setError(res.error);
    } else {
      // Clear unsaved overrides for this member now that they are applied
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      setSavedMemberId(memberId);
      setTimeout(() => {
        setSavedMemberId((curr) => (curr === memberId ? null : curr));
      }, 3000);
      setMessage(`Updated ${member.user.name}'s info successfully.`);
      router.refresh();
    }
  }

  async function handleRemove(memberId: string, name: string) {
    if (!confirm(`Are you sure you want to remove ${name} from this workspace?`)) return;
    setMessage(null);
    setError(null);
    const res = await removeMemberAction(memberId);
    if (res?.error) {
      setError(res.error);
    } else {
      setMessage(`Removed ${name} from workspace.`);
      router.refresh();
    }
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/register?invite=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  }

  const roleBadge = (role: WorkspaceRole) => {
    switch (role) {
      case WorkspaceRole.ADMIN:
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Shield className="w-3 h-3" /> Admin
          </span>
        );
      case WorkspaceRole.MANAGER:
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Briefcase className="w-3 h-3" /> Manager
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            <UserIcon className="w-3 h-3" /> Member
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-cyan-400" />
            Team Members
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your organization roster, roles, and member-specific hourly rates.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-sm flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{message}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="p-1 text-emerald-400 hover:text-emerald-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="p-1 text-red-400 hover:text-red-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Hourly Rate ({currency})</th>
                <th className="px-6 py-4">Joined Date</th>
                {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {members.map((member) => {
                const isSelf = member.userId === currentUserId;
                const initialRate =
                  member.hourlyRate !== null ? (member.hourlyRate / 100).toFixed(2) : '';
                const currentRole = overrides[member.id]?.role ?? member.role;
                const currentRate = overrides[member.id]?.hourlyRate ?? initialRate;
                const isModified =
                  (overrides[member.id]?.role !== undefined &&
                    overrides[member.id]?.role !== member.role) ||
                  (overrides[member.id]?.hourlyRate !== undefined &&
                    overrides[member.id]?.hourlyRate !== initialRate);

                return (
                  <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-400">
                          {member.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100 flex items-center gap-2">
                            <span>{member.user.name}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{member.user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {isAdmin && !isSelf ? (
                        <select
                          value={currentRole}
                          onChange={(e) => {
                            const newRole = e.target.value as WorkspaceRole;
                            setOverrides((prev) => ({
                              ...prev,
                              [member.id]: {
                                ...prev[member.id],
                                role: newRole,
                              },
                            }));
                          }}
                          className={`bg-slate-950 border text-xs font-medium text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 transition-colors ${
                            overrides[member.id]?.role !== undefined &&
                            overrides[member.id]?.role !== member.role
                              ? 'border-cyan-500/60 ring-1 ring-cyan-500/30'
                              : 'border-slate-800'
                          }`}
                        >
                          <option value={WorkspaceRole.MEMBER}>Member</option>
                          <option value={WorkspaceRole.MANAGER}>Manager</option>
                          <option value={WorkspaceRole.ADMIN}>Admin</option>
                        </select>
                      ) : (
                        roleBadge(member.role)
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 text-xs font-mono">
                            {getCurrencySymbol(currency)}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={currentRate}
                            placeholder="Default"
                            onChange={(e) => {
                              const newRate = e.target.value;
                              setOverrides((prev) => ({
                                ...prev,
                                [member.id]: {
                                  ...prev[member.id],
                                  hourlyRate: newRate,
                                },
                              }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && isModified) {
                                handleSave(member.id);
                              }
                            }}
                            className={`w-24 bg-slate-950 border rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors ${
                              overrides[member.id]?.hourlyRate !== undefined &&
                              overrides[member.id]?.hourlyRate !== initialRate
                                ? 'border-cyan-500/60 ring-1 ring-cyan-500/30'
                                : 'border-slate-800'
                            }`}
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono text-xs">
                          {initialRate
                            ? `${getCurrencySymbol(currency)}${initialRate}/hr`
                            : 'Workspace Default'}
                        </span>
                      )}
                    </td>

                    <td
                      className="px-6 py-4 text-xs text-slate-400 font-mono"
                      suppressHydrationWarning
                    >
                      {new Date(member.joinedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Save Changes Button */}
                          <button
                            type="button"
                            onClick={() => handleSave(member.id)}
                            disabled={
                              savingMemberId === member.id ||
                              (!isModified && savedMemberId !== member.id)
                            }
                            title={
                              isModified ? 'Click to save changes' : 'No unsaved changes'
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                              savingMemberId === member.id
                                ? 'bg-cyan-500/20 text-cyan-400 cursor-wait'
                                : savedMemberId === member.id
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isModified
                                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer'
                                : 'bg-slate-950/60 border border-slate-800/80 text-slate-600 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            {savingMemberId === member.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : savedMemberId === member.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </>
                            )}
                          </button>

                          {/* Delete Member */}
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleRemove(member.id, member.user.name)}
                              title="Remove member"
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Section */}
      {isAdmin && invitations.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-400" />
            Pending Invitations ({invitations.length})
          </h2>

          <div className="divide-y divide-slate-800">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-200">{inv.email}</span>
                  <div className="text-slate-500 flex items-center gap-3 mt-0.5">
                    <span>
                      Role: <strong className="text-slate-300">{inv.role}</strong>
                    </span>
                    <span suppressHydrationWarning>
                      Expires:{' '}
                      {new Date(inv.expiresAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyInviteLink(inv.token)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    {copiedToken === inv.token ? 'Copied Link!' : 'Copy Invite Link'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/80 backdrop-blur-sm">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-cyan-400" />
                  Invite Team Member
                </h3>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="colleague@company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Initial Role
                  </label>
                  <select
                    name="role"
                    defaultValue={WorkspaceRole.MEMBER}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value={WorkspaceRole.MEMBER}>Member</option>
                    <option value={WorkspaceRole.MANAGER}>Manager</option>
                    <option value={WorkspaceRole.ADMIN}>Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Hourly Rate ({currency})
                  </label>
                  <div className="relative">
                    <CurrencyIcon
                      currency={currency}
                      className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2"
                    />
                    <input
                      type="number"
                      step="0.01"
                      name="hourlyRate"
                      placeholder="Default"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
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
