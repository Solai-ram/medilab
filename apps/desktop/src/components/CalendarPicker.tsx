import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';

interface CalendarPickerProps {
  selectedDate: string; // 'YYYY-MM-DD' or ''
  onChange: (date: string) => void;
  patientDates?: string[]; // Array of ISO date strings or YYYY-MM-DD strings
  activityDates?: string[]; // Generic alias for activity indicator dates
  placeholder?: string;
  title?: string;
  showTodayButton?: boolean;
  align?: 'left' | 'right';
  className?: string;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  selectedDate,
  onChange,
  patientDates = [],
  activityDates,
  placeholder = 'Search by Date',
  title = 'Filter by date',
  showTodayButton = true,
  align = 'left',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse selected date or default to current date
  const initialDate = useMemo(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [selectedDate]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-11

  // Update view month/year if selectedDate changes externally
  useEffect(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m] = selectedDate.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [selectedDate]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Count events/patients/bills per date (YYYY-MM-DD)
  const effectiveDates = activityDates || patientDates;
  const patientCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of effectiveDates) {
      if (!d) continue;
      const key = d.slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [effectiveDates]);

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onChange(todayStr);
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Days grid generation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const formattedDisplay = useMemo(() => {
    if (!selectedDate) return null;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [selectedDate]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 shadow-sm ${
            selectedDate
              ? 'bg-teal-950/80 border-teal-500/60 text-teal-300 ring-1 ring-teal-500/30'
              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700'
          }`}
          title={title}
        >
          <CalendarIcon className={`w-3.5 h-3.5 ${selectedDate ? 'text-teal-400' : 'text-slate-400'}`} />
          <span>{formattedDisplay || placeholder}</span>
          {selectedDate && (
            <span
              onClick={handleClear}
              className="p-0.5 ml-1 rounded-full hover:bg-teal-800/60 text-teal-300 hover:text-white transition"
              title="Clear date filter"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>

        {/* Quick Today Pill */}
        {showTodayButton && (
          <button
            type="button"
            onClick={() => {
              if (selectedDate === todayStr) {
                onChange('');
              } else {
                onChange(todayStr);
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 border shadow-sm ${
              selectedDate === todayStr
                ? 'bg-teal-600 text-white border-teal-500 ring-1 ring-teal-400/40 shadow-teal-950/50'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700'
            }`}
            title="Filter by today"
          >
            Today
          </button>
        )}
      </div>

      {/* Popover Calendar Grid */}
      {isOpen && (
        <div
          className={`calendar-picker-popover absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-2 z-50 w-72 bg-slate-900/95 border border-slate-700/90 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none text-slate-200`}
          style={{ width: '290px' }}
        >
          {/* Calendar Header with Month/Year & Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span className="font-bold text-xs text-white tracking-wide">{monthName}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center py-2 text-[11px] font-mono font-bold text-slate-400 uppercase">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Previous Month Padding Days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayIndex + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-8 flex items-center justify-center text-slate-600 text-[11px] font-mono cursor-default select-none"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* Current Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = selectedDate === dateStr;
              const isToday = todayStr === dateStr;
              const patientCount = patientCountMap[dateStr] || 0;

              return (
                <button
                  key={`cur-${dayNum}`}
                  type="button"
                  onClick={() => {
                    onChange(dateStr);
                    setIsOpen(false);
                  }}
                  className={`h-8 rounded-xl font-mono text-xs flex flex-col items-center justify-center relative transition-all duration-150 ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold shadow-md shadow-teal-950/60 ring-1 ring-teal-400 scale-105 z-10'
                      : isToday
                      ? 'bg-teal-950/60 text-teal-300 font-bold border border-teal-600/70 hover:bg-teal-900/50'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                  }`}
                  title={`${dateStr}${isToday ? ' (Today)' : ''}${patientCount > 0 ? ` • ${patientCount} patient(s)` : ''}`}
                >
                  <span>{dayNum}</span>
                  {/* Indicator Dot for Days with Patient Registrations */}
                  {patientCount > 0 && (
                    <span
                      className={`w-1 h-1 rounded-full -mt-0.5 ${
                        isSelected ? 'bg-white' : 'bg-emerald-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar Bottom Actions */}
          <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleJumpToToday}
              className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 transition hover:underline"
            >
              Select Today
            </button>

            {selectedDate && (
              <button
                type="button"
                onClick={() => handleClear()}
                className="text-[11px] font-semibold text-slate-400 hover:text-rose-400 transition"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
