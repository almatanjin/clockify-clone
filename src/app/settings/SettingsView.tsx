'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateWorkspaceSettingsAction } from '@/app/actions/workspace';
import { WeekStart } from '@prisma/client';
import {
  Settings,
  Save,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

interface SettingsViewProps {
  workspace: {
    id: string;
    name: string;
    currency: string;
    defaultHourlyRate: number;
    weekStart: WeekStart;
  };
}

export function SettingsView({ workspace }: SettingsViewProps) {
  const router = useRouter();

  const [name, setName] = useState(workspace.name);
  const [currency, setCurrency] = useState(workspace.currency);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(
    (workspace.defaultHourlyRate / 100).toFixed(2)
  );
  const [weekStart, setWeekStart] = useState<WeekStart>(workspace.weekStart);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Workspace name is required.');
      return;
    }

    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.set('name', name.trim());
      formData.set('currency', currency);
      formData.set('defaultHourlyRate', defaultHourlyRate);
      formData.set('weekStart', weekStart);

      const res = await updateWorkspaceSettingsAction(formData);

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Workspace settings saved successfully!');
        router.refresh();
        setTimeout(() => {
          setSuccessMsg(null);
        }, 4000);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update workspace settings.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-cyan-400" />
          Workspace Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure currency, billing rates, and organizational defaults for &ldquo;{workspace.name}&rdquo;.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-sm flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="p-1 text-emerald-400 hover:text-emerald-200 rounded-lg hover:bg-emerald-500/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="p-1 text-red-400 hover:text-red-200 rounded-lg hover:bg-red-500/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Settings Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl"
      >
        <div className="space-y-5">
          {/* Workspace Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Workspace Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
          </div>

          {/* Currency & Hourly Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Currency Symbol / Code
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Default Hourly Rate ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={defaultHourlyRate}
                onChange={(e) => setDefaultHourlyRate(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Used for new billable projects lacking specific rate overrides.
              </p>
            </div>
          </div>

          {/* Week Starts On */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Week Starts On
            </label>
            <div className="flex gap-6 mt-1">
              <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer hover:text-slate-100">
                <input
                  type="radio"
                  name="weekStart"
                  value={WeekStart.MONDAY}
                  checked={weekStart === WeekStart.MONDAY}
                  onChange={() => setWeekStart(WeekStart.MONDAY)}
                  className="accent-cyan-400 w-4 h-4 cursor-pointer"
                />
                <span>Monday</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer hover:text-slate-100">
                <input
                  type="radio"
                  name="weekStart"
                  value={WeekStart.SUNDAY}
                  checked={weekStart === WeekStart.SUNDAY}
                  onChange={() => setWeekStart(WeekStart.SUNDAY)}
                  className="accent-cyan-400 w-4 h-4 cursor-pointer"
                />
                <span>Sunday</span>
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Governs weekly timesheet columns and weekly report date ranges.
            </p>
          </div>
        </div>

        {/* Form Actions Footer */}
        <div className="pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Only workspace administrators can save these changes.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

