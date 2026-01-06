'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  AlertTriangle,
  Calendar as CalendarIcon,
  Users,
  Receipt,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type DailyStats = {
  totalRevenue: number;
  totalSales: number;
  totalProfit: number;
  totalExpenses: number;
  salesCount: number;
  creditSalesCount: number;
};

type Product = {
  id: number;
  name: string;
  quantity: number;
  lowStockThreshold: number;
  unit: string;
};

type ChartData = {
  labels: string[];
  revenue: number[];
  sales: number[];
  expenses: number[];
  profit: number[];
};

type DashboardClientProps = {
  initialStats: DailyStats;
  lowStockProducts: Product[];
  chartData: ChartData;
  totalProducts: number;
  activeStaff: number;
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

function DateCalendar({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));

  useEffect(() => {
    setCurrentMonth(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [value]);

  const days = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const handleDayClick = (day: Date) => {
    const normalized = normalizeDate(day);
    onChange(normalized);
  };

  const isOutsideMonth = (day: Date) => day.getMonth() !== currentMonth.getMonth();
  const isToday = (day: Date) => isSameDay(day, new Date());
  const isSelected = (day: Date) => isSameDay(day, value);

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
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Select Date</p>
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
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day: string) => (
          <span key={day} className="text-center">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 select-none">
        {days.map((day: any) => {
          const selected = isSelected(day);
          const today = isToday(day);
          
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDayClick(day)}
              className={`px-0 py-1.5 text-sm rounded-lg transition-colors text-center border
                ${selected ? 'bg-blue-600 text-white border-blue-600 font-bold' : 'border-transparent'}
                ${today && !selected ? 'bg-blue-50 text-blue-700 font-semibold' : ''}
                ${isOutsideMonth(day) ? 'text-gray-400' : 'text-gray-700 hover:bg-blue-50'}
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-center text-gray-600">
        {value.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}

export default function DashboardClient({
  initialStats,
  lowStockProducts,
  chartData,
  totalProducts,
  activeStaff,
}: DashboardClientProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(normalizeDate(new Date()));
  const [stats, setStats] = useState<DailyStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const calendarButtonRef = useRef<HTMLButtonElement | null>(null);

  // Chart configurations
  const revenueChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Revenue',
        data: chartData.revenue,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Expenses',
        data: chartData.expenses,
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Profit',
        data: chartData.profit,
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const salesChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Sales Count',
        data: chartData.sales,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

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
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/dashboard/stats?date=${selectedDate.toISOString()}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [selectedDate]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setIsCalendarOpen(false);
  };

  const selectedDateLabel = useMemo(() => {
    const today = normalizeDate(new Date());
    if (isSameDay(selectedDate, today)) {
      return "Today's Performance";
    }
    return selectedDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, [selectedDate]);

  const statsCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      title: 'Sales Count',
      value: stats.salesCount.toString(),
      icon: Receipt,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Total Profit',
      value: formatCurrency(stats.totalProfit),
      icon: TrendingUp,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(stats.totalExpenses),
      icon: ArrowDown,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
  ];

  return (
    <div>
      {/* Date Selector */}
      <div className="relative z-20 bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-600">Viewing Data For</p>
            <p className="text-lg font-bold text-gray-900">{selectedDateLabel}</p>
          </div>
          <div className="relative z-50">
            <button
              ref={calendarButtonRef}
              type="button"
              onClick={() => setIsCalendarOpen((prev) => !prev)}
              className="h-11 px-4 flex items-center gap-2 rounded-full border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <CalendarIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Change Date</span>
            </button>
            {isCalendarOpen && (
              <div
                ref={calendarRef}
                className="absolute right-0 mt-2 w-72 z-[100] drop-shadow-2xl"
              >
                <DateCalendar value={selectedDate} onChange={handleDateChange} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat: any, index: number) => {
          const Icon = stat.icon;
          const isProfitCard = stat.title === 'Total Profit';
          const isRevenueCard = stat.title === 'Total Revenue';
          const isSalesCard = stat.title === 'Sales Count';
          const isExpensesCard = stat.title === 'Total Expenses';
          
          const profitMargin = isProfitCard && stats.totalRevenue > 0 
            ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)
            : null;
            
          const avgPerSale = isRevenueCard && stats.salesCount > 0
            ? formatCurrency(stats.totalRevenue / stats.salesCount)
            : null;
            
          const creditCount = isSalesCard ? stats.creditSalesCount : null;
            
          const expenseRatio = isExpensesCard && stats.totalRevenue > 0
            ? ((stats.totalExpenses / stats.totalRevenue) * 100).toFixed(1)
            : null;
          
          return (
            <div key={index} className={`bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl shadow-blue-500/10 border-2 ${stat.borderColor} hover:shadow-2xl transition-all duration-200 ${isLoading ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              {isProfitCard && profitMargin && (
                <p className="text-sm font-medium text-purple-600 mt-2">
                  {profitMargin}% of revenue
                </p>
              )}
              {isRevenueCard && avgPerSale && (
                <p className="text-sm font-medium text-green-600 mt-2">
                  {avgPerSale} avg per sale
                </p>
              )}
              {isSalesCard && (
                <p className="text-sm font-medium text-blue-600 mt-2">
                  {creditCount || 0} credit sales
                </p>
              )}
              {isExpensesCard && expenseRatio && (
                <p className="text-sm font-medium text-orange-600 mt-2">
                  {expenseRatio}% of revenue
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts and Insights */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Revenue, Expenses & Profit Trend (Last 7 Days)
          </h2>
          <div className="h-64">
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          {/* Inventory Overview */}
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              Inventory
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Products</span>
                <span className="text-2xl font-bold text-gray-900">{totalProducts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Staff</span>
                <span className="text-2xl font-bold text-gray-900">{activeStaff}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <a href="/pos" className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">New Sale</span>
              </a>
              <a href="/inventory" className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <Package className="h-5 w-5 text-indigo-600" />
                <span className="font-medium text-gray-900">Manage Inventory</span>
              </a>
              <a href="/expenses" className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
                <DollarSign className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-gray-900">Add Expense</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Sales vs Expenses Chart */}
      <div className="relative z-10 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-blue-600" />
          Daily Sales Count (Last 7 Days)
        </h2>
        <div className="h-80">
          <Bar data={salesChartData} options={chartOptions} />
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="relative z-10 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-red-500/10 border-2 border-red-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Low Stock Alert
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockProducts.map((product: any) => (
                <div key={product.id} className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="font-semibold text-gray-900 mb-1">{product.name}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Stock:</span>
                    <span className="font-bold text-red-600">{product.quantity} {product.unit}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Threshold:</span>
                    <span className="text-gray-900">{product.lowStockThreshold} {product.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
