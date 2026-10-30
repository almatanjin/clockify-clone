'use client';

import { useState, useEffect } from 'react';
import {
  startTimerAction,
  stopTimerAction,
  discardTimerAction,
  createManualEntryAction,
} from '@/app/actions/timer';
import { ActiveTimerData } from '@/lib/active-timer';
import { CurrencyIcon } from '@/components/ui/CurrencyIcon';
import {
  Play,
  Square,
  Trash2,
  FolderKanban,
  Tags,
  DollarSign,
  Plus,
  Clock,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ProjectOption {
  id: string;
  name: string;
  color: string;
  isBillable: boolean;
  tasks: Array<{ id: string; name: string }>;
}

interface TagOption {
  id: string;
  name: string;
}

interface TimerBarProps {
  initialActiveTimer: ActiveTimerData | null;
  projects: ProjectOption[];
  tags: TagOption[];
  currency?: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDateButton(dateKey: string): string {
  if (!dateKey) return 'Select Date';
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const [year, month, day] = dateKey.split('-').map(Number);
  const monthShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][(month || 1) - 1];

  if (dateKey === today) {
    return `Today (${monthShort} ${day})`;
  }
  if (dateKey === yesterday) {
    return `Yesterday (${monthShort} ${day})`;
  }

  return `${monthShort} ${day}, ${year}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function generateCalendarDays(year: number, month: number) {
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInCurrentMonth = getDaysInMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);

  const days: Array<{ dateStr: string; dayNumber: number; isCurrentMonth: boolean }> = [];

  // Prev month padding
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, day);
    const y = prevMonthDate.getFullYear();
    const m = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    days.push({
      dateStr: `${y}-${m}-${d}`,
      dayNumber: day,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const m = String(month + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    days.push({
      dateStr: `${year}-${m}-${dayStr}`,
      dayNumber: d,
      isCurrentMonth: true,
    });
  }

  // Next month padding to complete 35 or 42 cells
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    const y = nextMonthDate.getFullYear();
    const m = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    days.push({
      dateStr: `${y}-${m}-${dayStr}`,
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  return days;
}

export function TimerBar({ initialActiveTimer, projects, tags, currency = 'USD' }: TimerBarProps) {
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');
  const [activeTimer, setActiveTimerState] = useState<ActiveTimerData | null>(initialActiveTimer);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Form Fields
  const [description, setDescription] = useState(initialActiveTimer?.description || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialActiveTimer?.projectId || '');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialActiveTimer?.taskId || '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isBillable, setIsBillable] = useState(initialActiveTimer?.isBillable ?? false);

  // Manual Mode Fields
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualStart, setManualStart] = useState('09:00');
  const [manualEnd, setManualEnd] = useState('10:00');
  const [manualMinutes, setManualMinutes] = useState('60');

  // Dropdowns
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const [viewYear, setViewYear] = useState(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return Number(todayStr.split('-')[0]);
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return Number(todayStr.split('-')[1]) - 1;
  });

  function toggleCalendarPicker() {
    if (!showCalendarPicker && manualDate) {
      const [y, m] = manualDate.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
    setShowCalendarPicker((prev) => !prev);
  }

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  }

  function handleSelectDate(dateStr: string) {
    setManualDate(dateStr);
    const [y, m] = dateStr.split('-').map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m - 1);
    }
    setShowCalendarPicker(false);
  }

  function handleJumpToday() {
    const today = new Date().toISOString().split('T')[0];
    setManualDate(today);
    const [y, m] = today.split('-').map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m - 1);
    }
    setShowCalendarPicker(false);
  }

  function handleSelectYesterday() {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    setManualDate(yesterday);
    const [y, m] = yesterday.split('-').map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m - 1);
    }
    setShowCalendarPicker(false);
  }

  const calendarDays = generateCalendarDays(viewYear, viewMonth);
  const todayStr = new Date().toISOString().split('T')[0];

  // Sync state if initialActiveTimer prop changes
  useEffect(() => {
    setActiveTimerState(initialActiveTimer);
    if (initialActiveTimer) {
      setDescription(initialActiveTimer.description);
      setSelectedProjectId(initialActiveTimer.projectId || '');
      setSelectedTaskId(initialActiveTimer.taskId || '');
      setIsBillable(initialActiveTimer.isBillable);
    }
  }, [initialActiveTimer]);

  // Live Timer Tick derived from ISO timestamp (immune to tab background throttling)
  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(activeTimer.startTime).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startMs) / 1000)));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Auto-inherit billable status when picking a project
  function handleSelectProject(project: ProjectOption) {
    setSelectedProjectId(project.id);
    setSelectedTaskId('');
    setIsBillable(project.isBillable);
    setShowProjectPicker(false);
  }

  async function handleStart() {
    setLoading(true);
    const formData = new FormData();
    formData.set('description', description);
    if (selectedProjectId) formData.set('projectId', selectedProjectId);
    if (selectedTaskId) formData.set('taskId', selectedTaskId);
    formData.set('isBillable', isBillable ? 'true' : 'false');
    selectedTagIds.forEach((tid) => formData.append('tagIds', tid));

    const res = await startTimerAction(formData);
    setLoading(false);
    if (res?.timer) {
      setActiveTimerState({
        id: res.timer.id,
        workspaceId: res.timer.workspaceId,
        userId: res.timer.userId,
        projectId: res.timer.projectId,
        projectName: res.timer.project?.name,
        projectColor: res.timer.project?.color,
        taskId: res.timer.taskId,
        taskName: res.timer.task?.name,
        description: res.timer.description,
        startTime: res.timer.startTime.toISOString(),
        isBillable: res.timer.isBillable,
        hourlyRate: res.timer.hourlyRate,
      });
    }
  }

  async function handleStop() {
    setLoading(true);
    await stopTimerAction();
    setActiveTimerState(null);
    setDescription('');
    setSelectedProjectId('');
    setSelectedTaskId('');
    setSelectedTagIds([]);
    setLoading(false);
  }

  async function handleDiscard() {
    if (!confirm('Discard this running timer without saving?')) return;
    setLoading(true);
    await discardTimerAction();
    setActiveTimerState(null);
    setDescription('');
    setSelectedProjectId('');
    setSelectedTaskId('');
    setSelectedTagIds([]);
    setLoading(false);
  }

  async function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.set('description', description);
    if (selectedProjectId) formData.set('projectId', selectedProjectId);
    if (selectedTaskId) formData.set('taskId', selectedTaskId);
    formData.set('date', manualDate);
    formData.set('startTime', manualStart);
    formData.set('endTime', manualEnd);
    formData.set('durationMinutes', manualMinutes);
    formData.set('isBillable', isBillable ? 'true' : 'false');
    selectedTagIds.forEach((tid) => formData.append('tagIds', tid));

    await createManualEntryAction(formData);
    setDescription('');
    setLoading(false);
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-xl relative z-10">
      {/* Top Mode Toggle */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('timer')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === 'timer'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timer Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === 'manual'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Entry</span>
          </button>
        </div>

        {activeTimer && (
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              Recording
            </span>
          </div>
        )}
      </div>

      {/* Main Timer Bar Body */}
      {mode === 'timer' ? (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Description Input */}
          <div className="flex-1">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on?"
              disabled={!!activeTimer}
              className="w-full bg-transparent border-0 text-sm sm:text-base font-medium text-slate-100 placeholder:text-slate-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Project Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => !activeTimer && setShowProjectPicker(!showProjectPicker)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  selectedProject
                    ? 'bg-slate-950 border-slate-700 text-slate-100'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {selectedProject ? (
                  <>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: selectedProject.color }}
                    />
                    <span className="truncate max-w-[120px]">{selectedProject.name}</span>
                  </>
                ) : (
                  <>
                    <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Project</span>
                  </>
                )}
              </button>

              {/* Project Picker Dropdown */}
              {showProjectPicker && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowProjectPicker(false)} />
                  <div className="absolute right-0 sm:left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-40 max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProjectId('');
                        setSelectedTaskId('');
                        setShowProjectPicker(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
                    >
                      No Project
                    </button>
                    {projects.map((proj) => (
                      <div key={proj.id} className="py-1 border-t border-slate-800/60 first:border-0">
                        <button
                          type="button"
                          onClick={() => handleSelectProject(proj)}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800/80 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: proj.color }}
                            />
                            <span className="truncate">{proj.name}</span>
                          </div>
                          {selectedProjectId === proj.id && <Check className="w-3 h-3 text-cyan-400" />}
                        </button>

                        {/* Tasks under project */}
                        {proj.tasks.length > 0 && selectedProjectId === proj.id && (
                          <div className="pl-6 pr-2 py-1 space-y-0.5">
                            {proj.tasks.map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTaskId(task.id);
                                  setShowProjectPicker(false);
                                }}
                                className={`w-full text-left px-2 py-1 rounded text-[11px] truncate ${
                                  selectedTaskId === task.id
                                    ? 'bg-cyan-500/10 text-cyan-400 font-medium'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                                }`}
                              >
                                ↳ {task.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Tags Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => !activeTimer && setShowTagPicker(!showTagPicker)}
                className={`p-2 rounded-xl border transition-all ${
                  selectedTagIds.length > 0
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
                title="Select tags"
              >
                <Tags className="w-4 h-4" />
              </button>

              {showTagPicker && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowTagPicker(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-40 max-h-52 overflow-y-auto space-y-1">
                    {tags.length === 0 ? (
                      <p className="text-xs text-slate-500 p-2">No tags available.</p>
                    ) : (
                      tags.map((t) => {
                        const checked = selectedTagIds.includes(t.id);
                        return (
                          <label
                            key={t.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTagIds([...selectedTagIds, t.id]);
                                } else {
                                  setSelectedTagIds(selectedTagIds.filter((id) => id !== t.id));
                                }
                              }}
                              className="accent-cyan-400"
                            />
                            <span>#{t.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Billable Toggle */}
            <button
              type="button"
              onClick={() => !activeTimer && setIsBillable(!isBillable)}
              className={`p-2 rounded-xl border transition-all ${
                isBillable
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.2)]'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title={isBillable ? 'Billable Entry' : 'Non-Billable Entry'}
            >
              <CurrencyIcon currency={currency} className="w-4 h-4" />
            </button>

            {/* Digital Elapsed Display */}
            <div className="font-mono text-lg sm:text-xl font-bold tracking-wider text-slate-100 min-w-[95px] text-right px-2">
              {formatDuration(elapsedSeconds)}
            </div>

            {/* Action Buttons: START or STOP / DISCARD */}
            {activeTimer ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={loading}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center gap-2"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop</span>
                </button>
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={loading}
                  title="Discard without saving"
                  className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-slate-800/80 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                disabled={loading}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Start</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Manual Mode Form */
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              required
              className="flex-1 bg-transparent border-0 text-sm sm:text-base font-medium text-slate-100 placeholder:text-slate-600 focus:outline-none"
            />

            <div className="flex items-center gap-2 flex-wrap">
              {/* Custom Calendar Date Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={toggleCalendarPicker}
                  className={`flex items-center gap-2 bg-slate-950 border ${
                    showCalendarPicker
                      ? 'border-cyan-500/50 text-cyan-300 ring-1 ring-cyan-500/20'
                      : 'border-slate-800 text-slate-200 hover:border-slate-700 hover:text-slate-100'
                  } rounded-xl px-3 py-1.5 text-xs font-medium transition-all shadow-sm cursor-pointer`}
                  title="Choose date from calendar"
                >
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span suppressHydrationWarning>{formatDateButton(manualDate)}</span>
                </button>

                {showCalendarPicker && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowCalendarPicker(false)}
                    />
                    <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-2xl z-40 space-y-3">
                      {/* Calendar Navigation Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Previous month"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-semibold text-slate-200">
                          {MONTH_NAMES[viewMonth]} {viewYear}
                        </span>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Next month"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Day of Week Headers */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500">
                        {WEEKDAY_NAMES.map((w) => (
                          <div key={w} className="py-1">
                            {w}
                          </div>
                        ))}
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((cell) => {
                          const isSelected = cell.dateStr === manualDate;
                          const isToday = cell.dateStr === todayStr;

                          return (
                            <button
                              key={cell.dateStr}
                              type="button"
                              onClick={() => handleSelectDate(cell.dateStr)}
                              className={`h-8 w-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                                  : isToday
                                  ? 'border border-cyan-500/50 text-cyan-400 hover:bg-slate-800'
                                  : cell.isCurrentMonth
                                  ? 'text-slate-200 hover:bg-slate-800 hover:text-white'
                                  : 'text-slate-600 hover:bg-slate-800/40 hover:text-slate-400'
                              }`}
                            >
                              {cell.dayNumber}
                            </button>
                          );
                        })}
                      </div>

                      {/* Footer Quick Shortcuts */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleJumpToday}
                            className="px-2 py-1 bg-slate-800/80 hover:bg-slate-800 hover:text-cyan-400 text-slate-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={handleSelectYesterday}
                            className="px-2 py-1 bg-slate-800/80 hover:bg-slate-800 hover:text-cyan-400 text-slate-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Yesterday
                          </button>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {manualDate}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Start & End Times */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-300">
                <input
                  type="time"
                  value={manualStart}
                  onChange={(e) => setManualStart(e.target.value)}
                  className="bg-transparent border-0 text-slate-200 focus:outline-none text-xs"
                />
                <span className="text-slate-600">-</span>
                <input
                  type="time"
                  value={manualEnd}
                  onChange={(e) => setManualEnd(e.target.value)}
                  className="bg-transparent border-0 text-slate-200 focus:outline-none text-xs"
                />
              </div>

              {/* Project Selector */}
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  const proj = projects.find((p) => p.id === e.target.value);
                  if (proj) handleSelectProject(proj);
                  else setSelectedProjectId('');
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Billable button */}
              <button
                type="button"
                onClick={() => setIsBillable(!isBillable)}
                className={`p-2 rounded-xl border transition-all ${
                  isBillable
                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}
              >
                <CurrencyIcon currency={currency} className="w-4 h-4" />
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              >
                Add Entry
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
