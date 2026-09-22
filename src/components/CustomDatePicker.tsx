import { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check, X, AlertCircle } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // Format YYYY-MM-DD
  onChange: (dateStr: string) => void;
  maxDate?: string; // Format YYYY-MM-DD. Defaults to today.
  disabled?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// Helper to format date to YYYY-MM-DD
export function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CustomDatePicker({
  value,
  onChange,
  maxDate,
  disabled = false,
  className = '',
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine today's date string
  const todayStr = useMemo(() => {
    return formatDateToYMD(new Date());
  }, []);

  // Effective maximum date: strictly cannot pick after today
  const effectiveMaxDate = maxDate || todayStr;

  // Initial view year & month based on current value or today
  const [viewYear, setViewYear] = useState<number>(() => {
    const parts = value.split('-');
    return parts.length === 3 ? parseInt(parts[0], 10) : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const parts = value.split('-');
    return parts.length === 3 ? parseInt(parts[1], 10) - 1 : new Date().getMonth();
  });

  // When value changes, update view year/month if opened
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [value]);

  // Click outside and Escape handling
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isNextMonthDisabled) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Check if next month button should be disabled (cannot go into future months)
  const isNextMonthDisabled = useMemo(() => {
    const maxParts = effectiveMaxDate.split('-');
    if (maxParts.length !== 3) return false;
    const maxYear = parseInt(maxParts[0], 10);
    const maxMonth = parseInt(maxParts[1], 10) - 1;

    // If current view year & month is already maxYear & maxMonth or later
    if (viewYear > maxYear) return true;
    if (viewYear === maxYear && viewMonth >= maxMonth) return true;
    return false;
  }, [viewYear, viewMonth, effectiveMaxDate]);

  // Build calendar matrix
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // getDay(): 0 = Sunday, 1 = Monday, ... 6 = Saturday
    // We want Monday = 0, ..., Sunday = 6
    const dayOfWeek = (firstDay.getDay() + 6) % 7;
    const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Empty leading padding for day-of-week alignment
    for (let i = 0; i < dayOfWeek; i++) {
      days.push({
        dayNumber: 0,
        dateStr: '',
        isCurrentMonth: false,
        isDisabled: true,
        isToday: false,
        isSelected: false,
      });
    }

    // Days of current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      // Rule: Can only pick past days and today. Future days are strictly disabled.
      const isDisabled = dateStr > effectiveMaxDate;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === value;

      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isDisabled,
        isToday,
        isSelected,
      });
    }

    return days;
  }, [viewYear, viewMonth, effectiveMaxDate, todayStr, value]);

  // Formatted trigger label
  const formattedSelectedDate = useMemo(() => {
    if (!value) return 'Pilih Tanggal';
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);

    if (value === todayStr) {
      return `Hari Ini (${d} ${MONTH_NAMES[m]} ${y})`;
    }
    return `${d} ${MONTH_NAMES[m]} ${y}`;
  }, [value, todayStr]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        id="btn-custom-date-picker"
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all border shadow-2xs ${
          disabled
            ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
            : isOpen
              ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-500/20 cursor-pointer'
              : value === todayStr
                ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 cursor-pointer'
                : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 cursor-pointer'
        }`}
        title={disabled ? 'Filter tanggal nonaktif saat mode Semua Waktu' : 'Pilih tanggal (hari ini atau sebelumnya)'}
      >
        <Calendar className={`w-3.5 h-3.5 ${disabled ? 'text-slate-400' : 'text-blue-600'}`} />
        <span className="truncate max-w-[170px] sm:max-w-none">{formattedSelectedDate}</span>
      </button>

      {/* Calendar Popover */}
      {isOpen && (
        <div
          id="popover-custom-date-picker"
          className="absolute z-50 mt-2 left-0 sm:right-0 sm:left-auto w-[290px] max-w-[calc(100vw-24px)] bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 space-y-3 animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-black text-slate-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              disabled={isNextMonthDisabled}
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={isNextMonthDisabled ? 'Tidak dapat memilih bulan mendatang' : 'Bulan berikutnya'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Info rule indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50/80 border border-amber-200/60 rounded-lg text-[10px] text-amber-800 font-medium">
            <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="truncate">Hanya tanggal hari ini &amp; sebelumnya</span>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_NAMES.map((dn) => (
              <span key={dn} className="text-[10px] font-bold text-slate-400 uppercase py-0.5">
                {dn}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return <div key={`empty-${idx}`} className="w-8 h-8" />;
              }

              if (item.isDisabled) {
                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    disabled
                    title="Tanggal mendatang belum dapat dipilih"
                    className="w-8 h-8 flex items-center justify-center text-[11px] font-medium text-slate-300 bg-slate-50/60 rounded-lg cursor-not-allowed line-through select-none"
                  >
                    {item.dayNumber}
                  </button>
                );
              }

              return (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => {
                    onChange(item.dateStr);
                    setIsOpen(false);
                  }}
                  className={`w-8 h-8 flex items-center justify-center text-[11px] font-bold rounded-lg transition-all cursor-pointer relative ${
                    item.isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : item.isToday
                        ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title={item.isToday ? 'Hari Ini' : item.dateStr}
                >
                  {item.dayNumber}
                  {item.isToday && !item.isSelected && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-amber-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Action */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            >
              Pilih Hari Ini
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
