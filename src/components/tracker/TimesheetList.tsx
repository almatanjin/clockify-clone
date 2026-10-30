'use client';

import { useState } from 'react';
import { continueEntryAction, deleteTimeEntryAction, updateTimeEntryAction } from '@/app/actions/timer';
import { CurrencyIcon } from '@/components/ui/CurrencyIcon';
import {
  Play,
  Trash2,
  DollarSign,
  Calendar,
  Clock,
  Edit2,
  Check,
  X,
} from 'lucide-react';

interface EntryTagItem {
  tag: {
    id: string;
    name: string;
  };
}

export interface TimeEntryItem {
  id: string;
  description: string;
  startTime: Date | string;
  endTime: Date | string | null;
  duration: number | null; // seconds
  isBillable: boolean;
  hourlyRate: number;
  projectId: string | null;
  project: {
    id: string;
    name: string;
    color: string;
    client: { name: string } | null;
  } | null;
  taskId: string | null;
  task: {
    id: string;
    name: string;
  } | null;
  tags: EntryTagItem[];
}

interface TimesheetListProps {
  entries: TimeEntryItem[];
  userTimezone: string;
  currency?: string;
}

function getSafeTimezone(tz?: string): string | undefined {
  if (!tz) return undefined;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTime(dateStr: Date | string, timezone?: string): string {
  const d = new Date(dateStr);
  const safeTz = getSafeTimezone(timezone);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...(safeTz ? { timeZone: safeTz } : {}),
  });
}

function getDateKey(dateStr: Date | string, timezone?: string): string {
  const d = new Date(dateStr);
  const safeTz = getSafeTimezone(timezone);
  return d.toLocaleDateString('en-CA', safeTz ? { timeZone: safeTz } : undefined); // YYYY-MM-DD
}

function formatDayHeading(dateKey: string, timezone?: string): string {
  const safeTz = getSafeTimezone(timezone);
  const tzOptions = safeTz ? { timeZone: safeTz } : undefined;
  const now = new Date();
  const today = now.toLocaleDateString('en-CA', tzOptions);
  const yesterday = new Date(now.getTime() - 86400000).toLocaleDateString('en-CA', tzOptions);

  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';

  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function TimesheetList({ entries, userTimezone, currency = 'USD' }: TimesheetListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editBillable, setEditBillable] = useState(false);
  const [loading, setLoading] = useState(false);

  // Group entries by Date (YYYY-MM-DD)
  const grouped: Record<string, { totalSeconds: number; items: TimeEntryItem[] }> = {};

  entries.forEach((entry) => {
    const key = getDateKey(entry.startTime, userTimezone);
    if (!grouped[key]) {
      grouped[key] = { totalSeconds: 0, items: [] };
    }
    grouped[key].items.push(entry);
    if (entry.duration) {
      grouped[key].totalSeconds += entry.duration;
    }
  });

  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  async function handleContinue(id: string) {
    setLoading(true);
    await continueEntryAction(id);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this time entry?')) return;
    setLoading(true);
    await deleteTimeEntryAction(id);
    setLoading(false);
  }

  async function handleSaveEdit(id: string) {
    setLoading(true);
    const formData = new FormData();
    formData.set('id', id);
    formData.set('description', editDesc);
    formData.set('isBillable', editBillable ? 'true' : 'false');
    await updateTimeEntryAction(formData);
    setEditingId(null);
    setLoading(false);
  }

  if (entries.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
        <Clock className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-50" />
        <p className="text-sm font-medium">No time entries logged yet.</p>
        <p className="text-xs text-slate-600 mt-1">Start the timer or use manual entry above to begin tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dateKeys.map((dateKey) => {
        const group = grouped[dateKey];
        return (
          <div key={dateKey} className="space-y-2">
            {/* Date Group Header */}
            <div className="flex items-center justify-between px-3 text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-200" suppressHydrationWarning>
                  {formatDayHeading(dateKey, userTimezone)}
                </span>
                <span className="text-slate-500 font-normal">({dateKey})</span>
              </span>
              <span className="font-mono text-cyan-400">
                Total: <strong className="text-slate-100">{formatDuration(group.totalSeconds)}</strong>
              </span>
            </div>

            {/* Entries Container */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl divide-y divide-slate-800/60 shadow-lg overflow-hidden">
              {group.items.map((entry) => {
                const isEditing = editingId === entry.id;

                return (
                  <div
                    key={entry.id}
                    className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Left: Description, Project, Task, Tags */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 flex-1 focus:outline-none focus:border-cyan-500"
                          />
                          <button
                            type="button"
                            onClick={() => setEditBillable(!editBillable)}
                            className={`p-1.5 rounded-lg border text-xs ${
                              editBillable
                                ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                                : 'bg-slate-950 border-slate-800 text-slate-500'
                            }`}
                          >
                            <CurrencyIcon currency={currency} className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSaveEdit(entry.id)}
                            className="p-1 text-teal-400 hover:text-teal-300"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-500 hover:text-slate-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-sm font-semibold text-slate-200">
                            {entry.description || <span className="italic text-slate-500 font-normal">No description</span>}
                          </span>

                          {entry.project && (
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: entry.project.color }}
                              />
                              <span className="text-slate-300 font-semibold">{entry.project.name}</span>
                              {entry.project.client && (
                                <span className="text-slate-500 text-[11px]">
                                  • {entry.project.client.name}
                                </span>
                              )}
                            </div>
                          )}

                          {entry.task && (
                            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                              {entry.task.name}
                            </span>
                          )}

                          {entry.tags.map((t) => (
                            <span
                              key={t.tag.id}
                              className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded"
                            >
                              #{t.tag.name}
                            </span>
                          ))}

                          {entry.isBillable && (
                            <span className="p-0.5 text-teal-400" title="Billable">
                              <CurrencyIcon currency={currency} className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Time Range, Duration, Continue (Play), Edit, Delete */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 text-xs text-slate-400">
                      {/* Range */}
                      <span className="font-mono text-slate-500 hidden sm:inline" suppressHydrationWarning>
                        {formatTime(entry.startTime, userTimezone)}
                        {entry.endTime && ` - ${formatTime(entry.endTime, userTimezone)}`}
                      </span>

                      {/* Duration */}
                      <span className="font-mono font-bold text-sm text-slate-200 min-w-[70px] text-right">
                        {formatDuration(entry.duration)}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleContinue(entry.id)}
                          disabled={loading}
                          title="Continue tracking this entry"
                          className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-cyan-400" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingId(entry.id);
                            setEditDesc(entry.description);
                            setEditBillable(entry.isBillable);
                          }}
                          title="Edit entry"
                          className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={loading}
                          title="Delete entry"
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
