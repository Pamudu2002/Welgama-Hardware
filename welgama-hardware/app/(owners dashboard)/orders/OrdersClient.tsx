'use client';

import { useState, useMemo, useTransition, useEffect, useRef } from 'react';
import { Receipt, Printer, X, CheckCircle, Clock, CreditCard, Filter, Eye, Search, Calendar as CalendarIcon } from 'lucide-react';
import { markAsDelivered } from '@/lib/action';
import { useAlert } from '@/app/components/AlertProvider';
import { ButtonLoader, Spinner } from '@/app/components/Loading';

type OrderItem = {
  id: number;
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  discount: number;
  discountType: string;
  subtotal: number;
};

type Payment = {
  id: number;
  amount: number;
  date: string;
  note: string | null;
};

type Sale = {
  id: number;
  date: string;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  amountPaid: number;
  changeGiven: number;
  isDelivered: boolean;
  cashier: string;
  customer: {
    name: string;
    phone: string | null;
  } | null;
  items: OrderItem[];
  payments: Payment[];
};

type OrdersClientProps = {
  sales: Sale[];
};

type DateRange = {
  start: Date | null;
  end: Date | null;
};

const formatCurrency = (value: number) =>
  `Rs.${value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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

export default function OrdersClient({ sales }: OrdersClientProps) {
  const { showAlert, showConfirm } = useAlert();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [saleData, setSaleData] = useState<Sale[]>(sales);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const calendarButtonRef = useRef<HTMLButtonElement | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    setSaleData(sales);
  }, [sales]);

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

  // Filter sales by status
  const filteredSales = useMemo(() => {
    let result = saleData;

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((sale) =>
        sale.customer?.name?.toLowerCase().includes(term)
      );
    }

    if (dateRange.start || dateRange.end) {
      const startDate = dateRange.start ? new Date(dateRange.start) : null;
      const endDate = dateRange.end ? new Date(dateRange.end) : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);
      if (endDate) endDate.setHours(23, 59, 59, 999);

      result = result.filter((sale) => {
        const saleDate = new Date(sale.date);
        if (startDate && saleDate < startDate) return false;
        if (endDate && saleDate > endDate) return false;
        return true;
      });
    }

    if (statusFilter === 'pending_delivery') {
      return result.filter((sale) => !sale.isDelivered);
    }
    if (statusFilter === 'pending_payment') {
      return result.filter((sale) => sale.paymentStatus !== 'Paid');
    }
    if (statusFilter === 'completed') {
      return result.filter((sale) => sale.isDelivered);
    }
    return result;
  }, [saleData, statusFilter, searchTerm, dateRange.start, dateRange.end]);

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, dateRange.start, dateRange.end]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending_delivery':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'pending_payment':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending_delivery':
        return <Clock className="h-4 w-4" />;
      case 'pending_payment':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  // Format status text
  const formatStatus = (status: string) => {
    if (status === 'completed') {
      return 'Delivered';
    }
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getDeliveryStatus = (sale: Sale) => (sale.isDelivered ? 'completed' : 'pending_delivery');

  const getPaymentStatusColor = (paymentStatus: string) =>
    paymentStatus === 'Paid'
      ? 'bg-green-100 text-green-800 border-green-300'
      : 'bg-red-100 text-red-800 border-red-300';

  const getPaymentStatusIcon = (paymentStatus: string) =>
    paymentStatus === 'Paid'
      ? <CheckCircle className="h-4 w-4" />
      : <CreditCard className="h-4 w-4" />;

  const formatPaymentStatus = (paymentStatus: string) => {
    if (paymentStatus === 'Paid') return 'Paid';
    if (paymentStatus === 'Credit' || paymentStatus === 'Partial') {
      return 'Pending Payment';
    }
    return formatStatus(paymentStatus);
  };

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

  // Handle view details
  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setShowModal(true);
  };

  // Handle mark as delivered
  const handleMarkDelivered = async (saleId: number) => {
    const confirmed = await showConfirm(
      'Mark as Delivered?',
      'Are you sure you want to mark this order as delivered and completed?',
      'Mark as Complete',
      'green'
    );

    if (confirmed) {
      startTransition(async () => {
        const result = await markAsDelivered(saleId);
        if (result.success) {
          showAlert('success', 'Order Delivered!', result.message);
          setSaleData((prev) =>
            prev.map((sale) =>
              sale.id === saleId ? { ...sale, isDelivered: true, orderStatus: 'completed' } : sale
            )
          );
          setSelectedSale((prev) =>
            prev && prev.id === saleId ? { ...prev, isDelivered: true, orderStatus: 'completed' } : prev
          );
        } else {
          showAlert('error', 'Failed', result.message);
        }
      });
    }
  };

  // Print bill
  const printBill = () => {
    if (!selectedSale) return;
    
    const printContent = document.getElementById('print-content');
    if (printContent) {
      const windowPrint = window.open('', '', 'width=800,height=600');
      windowPrint?.document.write('<html><head><title>Print Bill</title>');
      windowPrint?.document.write('<style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}.text-right{text-align:right}.font-bold{font-weight:bold}.mb-4{margin-bottom:16px}.border-t{border-top:2px solid #000;margin-top:8px;padding-top:8px}</style>');
      windowPrint?.document.write('</head><body>');
      windowPrint?.document.write(printContent.innerHTML);
      windowPrint?.document.write('</body></html>');
      windowPrint?.document.close();
      windowPrint?.print();
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
              <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Orders
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage and track customer orders</p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="mb-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap sm:gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by customer name"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Orders</option>
                <option value="completed">Delivered</option>
                <option value="pending_delivery">Pending Delivery</option>
                <option value="pending_payment">Pending Payment</option>
              </select>
            </div>
            <div className="relative w-full sm:w-auto">
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

        {/* Orders Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Cashier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  paginatedSales.map((sale) => {
                    const deliveryStatus = getDeliveryStatus(sale);
                    return (
                      <tr key={sale.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">#{sale.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(sale.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{sale.customer?.name || 'Walk-in'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{sale.cashier}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">{formatCurrency(sale.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(deliveryStatus)}`}>
                            {getStatusIcon(deliveryStatus)}
                            {formatStatus(deliveryStatus)}
                          </div>
                          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium ${getPaymentStatusColor(sale.paymentStatus)}`}>
                            {getPaymentStatusIcon(sale.paymentStatus)}
                            {formatPaymentStatus(sale.paymentStatus)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(sale)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {!sale.isDelivered && (
                            <button
                              onClick={() => handleMarkDelivered(sale.id)}
                              disabled={isPending}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-50"
                              title="Mark as Delivered"
                            >
                              {isPending ? <Spinner className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSales.length)} of {filteredSales.length} orders
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showModal && selectedSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Print Content */}
            <div id="print-content" className="p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-center mb-4">Welgama Hardware</h1>
                <div className="text-center text-sm text-gray-600 mb-4">
                  <p>Order #{selectedSale.id}</p>
                  <p>{formatDate(selectedSale.date)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Customer:</p>
                    <p className="text-gray-600">{selectedSale.customer?.name || 'Walk-in Customer'}</p>
                    {selectedSale.customer?.phone && (
                      <p className="text-gray-600">{selectedSale.customer.phone}</p>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Cashier:</p>
                    <p className="text-gray-600">{selectedSale.cashier}</p>
                    <p className="font-medium mt-2">Status:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(getDeliveryStatus(selectedSale))}`}>
                        {getStatusIcon(getDeliveryStatus(selectedSale))}
                        {formatStatus(getDeliveryStatus(selectedSale))}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium ${getPaymentStatusColor(selectedSale.paymentStatus)}`}>
                        {getPaymentStatusIcon(selectedSale.paymentStatus)}
                        {formatPaymentStatus(selectedSale.paymentStatus)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-6">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2">Item</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Discount</th>
                    <th className="text-right py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-2">{item.productName}</td>
                      <td className="text-center py-2">{item.quantity} {item.unit}</td>
                      <td className="text-right py-2">{formatCurrency(item.price)}</td>
                      <td className="text-right py-2">
                        {item.discount > 0
                          ? item.discountType === 'percentage'
                            ? `${item.discount}%`
                            : formatCurrency(item.discount)
                          : '-'}
                      </td>
                      <td className="text-right py-2 font-medium">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(selectedSale.items.reduce((sum, item) => sum + item.subtotal, 0))}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t-2 border-gray-300 pt-2">
                  <span>Total:</span>
                  <span className="text-blue-600">{formatCurrency(selectedSale.totalAmount)}</span>
                </div>
                
                {selectedSale.paymentStatus === 'Paid' && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Amount Paid:</span>
                      <span className="font-medium">{formatCurrency(selectedSale.amountPaid)}</span>
                    </div>
                    {selectedSale.changeGiven > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Change:</span>
                        <span className="font-medium">{formatCurrency(selectedSale.changeGiven)}</span>
                      </div>
                    )}
                  </>
                )}
                
                {selectedSale.payments.length > 0 && (
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <p className="font-medium mb-1">Payment History:</p>
                    {selectedSale.payments.map((payment) => (
                      <div key={payment.id} className="flex justify-between text-xs text-gray-600">
                        <span>{formatDate(payment.date)}</span>
                        <span>{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-center text-sm text-gray-500 border-t border-gray-200 pt-4">
                Thank you for your business!
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={printBill}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="h-5 w-5" />
                Print Bill
              </button>
              {!selectedSale.isDelivered && (
                <button
                  onClick={() => {
                    setShowModal(false);
                    handleMarkDelivered(selectedSale.id);
                  }}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  Mark as Delivered
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
