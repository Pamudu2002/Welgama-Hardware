'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Loader2, 
  AlertCircle, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  DollarSign, 
  Trash2,
  Edit,
  PlusCircle,
  Truck,
  Calendar as CalendarIcon
} from 'lucide-react';
import type { ActivityLogEntry } from './types';

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat('en-LK', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatActionLabel = (action: string) =>
  action
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');

const formatMetaValue = (key: string, value: unknown) => {
  if (value === null || value === undefined) {
    return '—';
  }

  // Format currency fields
  const currencyFields = ['costPrice', 'sellingPrice', 'totalAmount', 'amountPaid', 'changeGiven', 'changeReturned', 'remainingBalance'];
  if (currencyFields.includes(key) && typeof value === 'number') {
    return `Rs.${value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return value.toLocaleString('en-LK');
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return JSON.stringify(value, null, 2);
};

const hasMetadata = (metadata: Record<string, unknown> | null) =>
  !!metadata && Object.keys(metadata).length > 0;

type ActionConfig = {
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ElementType;
  label: string;
};

const getActionConfig = (action: string): ActionConfig => {
  const configs: Record<string, ActionConfig> = {
    'product.create': {
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      icon: PlusCircle,
      label: 'Product Added',
    },
    'product.update': {
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      icon: Edit,
      label: 'Product Updated',
    },
    'product.delete': {
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      icon: Trash2,
      label: 'Product Deleted',
    },
    'category.create': {
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-200',
      icon: Package,
      label: 'Category Created',
    },
    'sale.complete': {
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      icon: ShoppingCart,
      label: 'Sale Completed',
    },
    'sale.credit': {
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      icon: FileText,
      label: 'Credit Sale',
    },
    'payment.record': {
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-700',
      borderColor: 'border-teal-200',
      icon: DollarSign,
      label: 'Payment Recorded',
    },
    'customer.create': {
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      borderColor: 'border-indigo-200',
      icon: Users,
      label: 'Customer Created',
    },
    'staff.create': {
      bgColor: 'bg-violet-50',
      textColor: 'text-violet-700',
      borderColor: 'border-violet-200',
      icon: Users,
      label: 'Staff Created',
    },
    'staff.activate': {
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      icon: Users,
      label: 'Staff Activated',
    },
    'staff.deactivate': {
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200',
      icon: Users,
      label: 'Staff Deactivated',
    },
    'draft.create': {
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-700',
      borderColor: 'border-slate-200',
      icon: FileText,
      label: 'Draft Saved',
    },
    'draft.delete': {
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200',
      icon: Trash2,
      label: 'Draft Deleted',
    },
    'order.delivered': {
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-700',
      borderColor: 'border-cyan-200',
      icon: Truck,
      label: 'Order Delivered',
    },
    'expense.create': {
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      icon: DollarSign,
      label: 'Expense Added',
    },
  };

  return configs[action] || {
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    icon: Activity,
    label: formatActionLabel(action),
  };
};

type DateRange = {
  start: Date | null;
  end: Date | null;
};

const normalizeDate = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isWithinRange = (day: Date, range: DateRange) => {
  if (!range.start || !range.end) return false;
  const time = day.getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
};

const buildCalendarDays = (month: Date) => {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const startDayOffset = firstOfMonth.getDay();
  const calendarStart = new Date(firstOfMonth);
  calendarStart.setDate(firstOfMonth.getDate() - startDayOffset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + i);
    days.push(day);
  }
  return days;
};

function DateRangeCalendar({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const initialMonth = value.start ? new Date(value.start.getFullYear(), value.start.getMonth(), 1) : new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  const [draftRange, setDraftRange] = useState<DateRange>(value);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  useEffect(() => {
    setDraftRange(value);
    if (value.start) {
      setCurrentMonth(new Date(value.start.getFullYear(), value.start.getMonth(), 1));
    }
  }, [value]);

  const days = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const handleDayClick = (day: Date) => {
    const normalized = normalizeDate(day);
    if (!draftRange.start || draftRange.end) {
      setDraftRange({ start: normalized, end: null });
      setHoveredDate(null);
      return;
    }

    let start = draftRange.start;
    let end = normalized;
    if (start && end.getTime() < start.getTime()) {
      [start, end] = [end, start];
    }
    const finalRange = { start, end } as DateRange;
    setDraftRange(finalRange);
    setHoveredDate(null);
    onChange(finalRange);
  };

  const handleHover = (day: Date) => {
    if (!draftRange.start || draftRange.end) return;
    setHoveredDate(normalizeDate(day));
  };

  const displayedRange = useMemo(() => {
    if (draftRange.start && draftRange.end) {
      return draftRange;
    }

    if (draftRange.start && hoveredDate) {
      const start = draftRange.start;
      let end = hoveredDate;
      if (start && end.getTime() < start.getTime()) {
        return { start: end, end: start };
      }
      return { start, end };
    }

    return draftRange;
  }, [draftRange, hoveredDate]);

  const isOutsideMonth = (day: Date) => day.getMonth() !== currentMonth.getMonth();

  const clearRange = () => {
    setDraftRange({ start: null, end: null });
    setHoveredDate(null);
    onChange({ start: null, end: null });
  };

  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() =>
            setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
          }
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300"
        >
          Prev
        </button>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Select Range</p>
          <p className="text-sm font-semibold text-gray-900">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
          }
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300"
        >
          Next
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold text-gray-500 mb-1.5">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <span key={day} className="text-center">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 select-none" onMouseLeave={() => setHoveredDate(null)}>
        {days.map((day) => {
          const hasCompleteRange = Boolean(displayedRange.start && displayedRange.end);
          const isStart = displayedRange.start ? isSameDay(day, displayedRange.start) : false;
          const isEnd = displayedRange.end ? isSameDay(day, displayedRange.end) : false;
          const inRange = hasCompleteRange
            ? isWithinRange(day, displayedRange)
            : displayedRange.start && isSameDay(day, displayedRange.start);
          const isEdge = hasCompleteRange ? isStart || isEnd : isStart;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => handleHover(day)}
              className={`px-0 py-1.5 text-sm rounded-lg transition-colors text-center border
                ${inRange ? 'bg-blue-100 border-blue-200 text-blue-700' : 'border-transparent'}
                ${isEdge ? 'bg-blue-600 text-white border-blue-600' : ''}
                ${isOutsideMonth(day) ? 'text-gray-400' : 'text-gray-700 hover:bg-blue-50'}
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
        <span>
          {value.start && value.end
            ? `${value.start.toLocaleDateString()} - ${value.end.toLocaleDateString()}`
            : 'All dates'}
        </span>
        {value.start || value.end ? (
          <button
            type="button"
            onClick={clearRange}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

type LogsClientProps = {
  initialLogs: ActivityLogEntry[];
  initialCursor: number | null;
};

export default function LogsClient({ initialLogs, initialCursor }: LogsClientProps) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>(initialLogs);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const calendarButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isCalendarOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        calendarRef.current?.contains(target) ||
        calendarButtonRef.current?.contains(target)
      ) {
        return;
      }
      setIsCalendarOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalendarOpen]);

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      setIsCalendarOpen(false);
    }
  }, [dateRange.start, dateRange.end]);

  const filteredLogs = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return logs;

    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    const endDate = dateRange.end ? new Date(dateRange.end) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    return logs.filter((log) => {
      const logDate = new Date(log.createdAt);
      if (startDate && logDate < startDate) return false;
      if (endDate && logDate > endDate) return false;
      return true;
    });
  }, [logs, dateRange]);

  const dateRangeLabel = useMemo(() => {
    if (dateRange.start && dateRange.end) {
      const sameYear = dateRange.start.getFullYear() === dateRange.end.getFullYear();
      const options: Intl.DateTimeFormatOptions = sameYear
        ? { month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' };
      const startLabel = dateRange.start.toLocaleDateString('en-US', options);
      const endLabel = dateRange.end.toLocaleDateString('en-US', options);
      return `${startLabel} - ${endLabel}`;
    }
    return 'All Dates';
  }, [dateRange.start, dateRange.end]);
  const hasDateRange = Boolean(dateRange.start && dateRange.end);

  const actorCount = useMemo(() => new Set(logs.map((log) => log.user?.username || log.user?.role || 'Unknown')).size, [logs]);

  const handleLoadMore = async () => {
    if (!cursor) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/logs?cursor=${cursor}`);
      if (!response.ok) {
        throw new Error('Failed to load more logs');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to load more logs');
      }

      const normalized: ActivityLogEntry[] = data.logs.map((log: ActivityLogEntry) => ({
        ...log,
        metadata: (log.metadata as Record<string, unknown> | null) ?? null,
      }));

      setLogs((prev) => [...prev, ...normalized]);
      setCursor(data.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load logs');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400 opacity-10 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-400 opacity-10 blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto w-full px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Activity Logs
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Live audit trail for every action taken across the system</p>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{logs.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{actorCount}</p>
            </div>
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Filter by Date:</span>
            <div className="relative">
              <button
                ref={calendarButtonRef}
                type="button"
                onClick={() => setIsCalendarOpen((prev) => !prev)}
                aria-label="Select date range"
                title={dateRangeLabel}
                className={`h-11 w-11 flex items-center justify-center rounded-full border transition-colors
                  ${hasDateRange
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              >
                <CalendarIcon className="h-5 w-5" />
              </button>
              {isCalendarOpen && (
                <div
                  ref={calendarRef}
                  className="absolute right-0 mt-2 w-72 z-30 drop-shadow-2xl"
                >
                  <DateRangeCalendar value={dateRange} onChange={setDateRange} />
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {filteredLogs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 p-12 text-center text-gray-500">
            <p>No activity captured yet. Actions taken by users will appear here immediately.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredLogs.map((log) => {
              const config = getActionConfig(log.action);
              const Icon = config.icon;
              
              return (
                <li key={log.id}>
                  <div className={`rounded-2xl border ${config.borderColor} ${config.bgColor} p-4 shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 rounded-xl ${config.bgColor} ${config.textColor} p-3 border ${config.borderColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                                {config.label}
                              </span>
                              <span className="text-xs text-gray-500">{formatDateTime(log.createdAt)}</span>
                            </div>
                            <p className="mt-2 text-base font-semibold text-gray-900">{log.description}</p>
                            <p className="mt-1 text-sm text-gray-600">
                              by <span className="font-semibold text-gray-800">{log.user?.username || log.user?.role || 'Unknown'}</span>
                            </p>

                            {/* Metadata as inline details */}
                            {hasMetadata(log.metadata) && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {Object.entries(log.metadata as Record<string, unknown>)
                                  .filter(([key]) => !key.toLowerCase().includes('id') || key === 'saleId' || key === 'draftId')
                                  .map(([key, value]) => {
                                    const displayValue = formatMetaValue(key, value);
                                    if (displayValue === '—' || displayValue === 'null' || displayValue === 'undefined') return null;
                                    
                                    return (
                                      <span
                                        key={`${log.id}-${key}`}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/70 px-3 py-1.5 text-xs border border-gray-200"
                                      >
                                        <span className="font-semibold text-gray-600">{key}:</span>
                                        <span className="text-gray-900 font-medium">{displayValue}</span>
                                      </span>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {cursor && (
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading
                </>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
