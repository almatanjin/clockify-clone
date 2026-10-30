'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  label?: string;
  align?: 'left' | 'right';
  minDate?: string;
  maxDate?: string;
  className?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDateDisplay(dateKey: string): string {
  if (!dateKey) return 'Select Date';
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateKey;

  const [year, month, day] = parts;
  const monthShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][(month || 1) - 1];

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

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

  // Next month padding to complete grid
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

export function DatePicker({
  value,
  onChange,
  label,
  align = 'left',
  minDate,
  maxDate,
  className = '',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const [viewYear, setViewYear] = useState(() => {
    if (value) {
      const y = Number(value.split('-')[0]);
      if (!isNaN(y)) return y;
    }
    return Number(todayStr.split('-')[0]);
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (value) {
      const m = Number(value.split('-')[1]);
      if (!isNaN(m)) return m - 1;
    }
    return Number(todayStr.split('-')[1]) - 1;
  });

  // When value changes, update view month/year if picker is reopened
  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [value]);

  function handleToggle() {
    if (!isOpen && value) {
      const [y, m] = value.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
    setIsOpen((prev) => !prev);
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
    onChange(dateStr);
    setIsOpen(false);
  }

  function handleJumpToday() {
    onChange(todayStr);
    const [y, m] = todayStr.split('-').map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m - 1);
    }
    setIsOpen(false);
  }

  function handleSelectYesterday() {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    onChange(yesterday);
    const [y, m] = yesterday.split('-').map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m - 1);
    }
    setIsOpen(false);
  }

  const calendarDays = generateCalendarDays(viewYear, viewMonth);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-2 bg-slate-950 border ${
          isOpen
            ? 'border-cyan-500/50 text-cyan-300 ring-1 ring-cyan-500/20'
            : 'border-slate-800 text-slate-200 hover:border-slate-700 hover:text-slate-100'
        } rounded-xl px-3 py-1.5 text-xs font-medium transition-all shadow-sm cursor-pointer`}
      >
        <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        {label && <span className="text-slate-400 font-normal mr-0.5">{label}:</span>}
        <span suppressHydrationWarning className="font-semibold text-slate-200">
          {formatDateDisplay(value)}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={`absolute ${
              align === 'right' ? 'right-0' : 'left-0'
            } mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-2xl z-50 space-y-3 animate-in fade-in zoom-in-95 duration-100`}
          >
            {/* Header: Month & Year Controls */}
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

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500">
              {WEEKDAY_NAMES.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell) => {
                const isSelected = cell.dateStr === value;
                const isToday = cell.dateStr === todayStr;
                const isBeforeMin = minDate ? cell.dateStr < minDate : false;
                const isAfterMax = maxDate ? cell.dateStr > maxDate : false;
                const isDisabled = isBeforeMin || isAfterMax;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectDate(cell.dateStr)}
                    className={`h-8 w-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
                      isDisabled
                        ? 'text-slate-700 cursor-not-allowed opacity-30'
                        : 'cursor-pointer'
                    } ${
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

            {/* Quick shortcuts & selected date */}
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
                {value || todayStr}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

