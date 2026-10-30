'use client';

import { useState } from 'react';
import { updateWeeklyCellAction } from '@/app/actions/timesheet';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  FolderKanban,
  Check,
} from 'lucide-react';

interface ProjectOption {
  id: string;
  name: string;
  color: string;
  tasks: Array<{ id: string; name: string }>;
}

interface GridDay {
  dateStr: string;
  label: string;
  dayName: string;
}

interface GridRow {
  key: string;
  projectId: string | null;
  projectName: string;
  projectColor: string;
  clientName: string | null;
  taskId: string | null;
  taskName: string | null;
  cellDurations: Record<string, number>;
  totalDuration: number;
}

interface WeeklyGridViewProps {
  initialData: {
    days: GridDay[];
    rows: GridRow[];
    columnTotals: Record<string, number>;
    grandTotal: number;
  };
  projects: ProjectOption[];
  currentWeekStart: string;
}

function formatHours(seconds: number): string {
  if (!seconds || seconds <= 0) return '0.00';
  return (seconds / 3600).toFixed(2);
}

function formatDurationHhMm(seconds: number): string {
  if (!seconds || seconds <= 0) return '0h 00m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function WeeklyGridView({
  initialData,
  projects,
  currentWeekStart,
}: WeeklyGridViewProps) {
  const [data, setData] = useState(initialData);
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loading, setLoading] = useState(false);

  function handleNavigateWeek(offsetWeeks: number) {
    const current = new Date(weekStart);
    current.setDate(current.getDate() + offsetWeeks * 7);
    const newDateStr = current.toISOString().split('T')[0];
    window.location.href = `/timesheet?date=${newDateStr}`;
  }

  async function handleCellBlur(
    projectId: string | null,
    taskId: string | null,
    dateStr: string,
    val: string
  ) {
    const num = parseFloat(val) || 0;
    await updateWeeklyCellAction(projectId, taskId, dateStr, num);
  }

  function handleAddRow() {
    if (!selectedProjectId) return;
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (!proj) return;

    const task = proj.tasks.find((t) => t.id === selectedTaskId);
    const key = `${selectedProjectId}:${selectedTaskId || 'none'}`;

    if (data.rows.some((r) => r.key === key)) {
      setShowAddRowModal(false);
      return;
    }

    const newRow: GridRow = {
      key,
      projectId: selectedProjectId,
      projectName: proj.name,
      projectColor: proj.color,
      clientName: null,
      taskId: selectedTaskId || null,
      taskName: task?.name || null,
      cellDurations: {},
      totalDuration: 0,
    };

    data.days.forEach((d) => {
      newRow.cellDurations[d.dateStr] = 0;
    });

    setData({
      ...data,
      rows: [...data.rows, newRow],
    });

    setShowAddRowModal(false);
    setSelectedProjectId('');
    setSelectedTaskId('');
  }

  const selectedProjObj = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      {/* Week Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-cyan-400" />
            Weekly Timesheet
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Log, inspect, and adjust hours across all 7 days in a clean matrix.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => handleNavigateWeek(-1)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 text-xs font-semibold text-slate-200 font-mono">
            {data.days[0]?.label} - {data.days[6]?.label}
          </span>

          <button
            onClick={() => handleNavigateWeek(1)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-x-auto shadow-2xl">
        <table className="w-full text-left text-sm border-collapse min-w-[750px]">
          {/* Header Days */}
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs">
              <th className="px-5 py-4 w-72 uppercase font-semibold tracking-wider">
                Project / Task
              </th>
              {data.days.map((day) => (
                <th key={day.dateStr} className="px-3 py-4 text-center">
                  <div className="font-semibold text-slate-300">{day.dayName}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{day.label}</div>
                </th>
              ))}
              <th className="px-5 py-4 text-right uppercase font-semibold tracking-wider w-28">
                Total
              </th>
            </tr>
          </thead>

          {/* Rows */}
          <tbody className="divide-y divide-slate-800/60">
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-slate-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No project rows recorded for this week.</p>
                  <button
                    onClick={() => setShowAddRowModal(true)}
                    className="mt-3 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-semibold hover:bg-cyan-500/20 transition-colors"
                  >
                    + Add Project Row
                  </button>
                </td>
              </tr>
            ) : (
              data.rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: row.projectColor }}
                      />
                      <div className="truncate">
                        <div className="font-semibold text-slate-200 text-xs truncate">
                          {row.projectName}
                        </div>
                        {row.taskName && (
                          <div className="text-[11px] text-slate-400 truncate">↳ {row.taskName}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 7 Day Inputs */}
                  {data.days.map((day) => {
                    const durSec = row.cellDurations[day.dateStr] || 0;
                    const hoursVal = durSec > 0 ? (durSec / 3600).toFixed(2) : '';

                    return (
                      <td key={day.dateStr} className="px-2 py-3 text-center">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="24"
                          defaultValue={hoursVal}
                          placeholder="0.0"
                          onBlur={(e) =>
                            handleCellBlur(row.projectId, row.taskId, day.dateStr, e.target.value)
                          }
                          className="w-16 bg-slate-950 border border-slate-800 rounded-lg py-1.5 text-center text-xs text-slate-100 font-mono placeholder:text-slate-700 focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                    );
                  })}

                  {/* Row Total */}
                  <td className="px-5 py-3 text-right font-mono font-bold text-xs text-slate-200">
                    {formatHours(row.totalDuration)}h
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Footer Totals */}
          {data.rows.length > 0 && (
            <tfoot>
              <tr className="bg-slate-950/90 border-t border-slate-800 font-mono text-xs">
                <td className="px-5 py-4 font-bold text-slate-300 flex items-center justify-between">
                  <span>Day Totals</span>
                  <button
                    onClick={() => setShowAddRowModal(true)}
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Row
                  </button>
                </td>
                {data.days.map((day) => {
                  const daySec = data.columnTotals[day.dateStr] || 0;
                  return (
                    <td key={day.dateStr} className="px-2 py-4 text-center font-bold text-cyan-400">
                      {formatHours(daySec)}h
                    </td>
                  );
                })}
                <td className="px-5 py-4 text-right font-bold text-sm text-teal-300">
                  {formatDurationHhMm(data.grandTotal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add Row Modal */}
      {showAddRowModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
                <FolderKanban className="w-5 h-5 text-cyan-400" />
                Add Project Row
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setSelectedTaskId('');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProjObj && selectedProjObj.tasks.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Task (Optional)</label>
                    <select
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">No specific task</option>
                      {selectedProjObj.tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRowModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!selectedProjectId}
                    onClick={handleAddRow}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
                  >
                    Add Row
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
