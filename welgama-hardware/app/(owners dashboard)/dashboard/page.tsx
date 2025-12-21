// app/(dashboard)/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { prisma } from '@/lib/db';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await auth();
  
  if (session?.user?.role !== 'Owner') {
    redirect('/pos');
  }

  // Get today's date range
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch today's sales
  const todaySales = await prisma.sale.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      items: true,
    },
  });

  // Fetch today's expenses
  const todayExpenses = await prisma.expense.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Calculate today's stats
  const totalRevenue = todaySales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const totalExpenses = todayExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  
  // Calculate total cost of goods sold
  const totalCost = todaySales.reduce((sum, sale) => {
    const saleCost = sale.items.reduce((itemSum, item) => {
      return itemSum + (Number(item.costPriceSnapshot) * item.quantity);
    }, 0);
    return sum + saleCost;
  }, 0);

  const totalProfit = totalRevenue - totalCost;
  
  // Count credit sales (pending payments)
  const creditSalesCount = todaySales.filter(sale => 
    sale.paymentStatus === 'Pending' || sale.paymentStatus === 'Credit'
  ).length;

  // Get last 7 days data for charts
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  const chartData = await Promise.all(
    last7Days.map(async (date) => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const daySales = await prisma.sale.findMany({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          items: true,
        },
      });

      const dayExpenses = await prisma.expense.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const revenue = daySales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
      const expenses = dayExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      
      // Calculate cost of goods sold for the day
      const dayCost = daySales.reduce((sum, sale) => {
        const saleCost = sale.items.reduce((itemSum, item) => {
          return itemSum + (Number(item.costPriceSnapshot) * item.quantity);
        }, 0);
        return sum + saleCost;
      }, 0);
      
      const profit = revenue - dayCost;

      return {
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue,
        sales: daySales.length,
        expenses,
        profit,
      };
    })
  );

  // Get low stock products
  const lowStockProducts = await prisma.product.findMany({
    where: {
      quantity: {
        lte: prisma.product.fields.lowStockThreshold,
      },
    },
    orderBy: {
      quantity: 'asc',
    },
    take: 10,
  });

  // Get total products and active staff
  const totalProducts = await prisma.product.count();
  const activeStaff = await prisma.user.count({
    where: {
      role: 'Cashier',
      active: true,
    },
  });

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
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Owner Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Welcome back, {session?.user?.name || 'Owner'}!</p>
            </div>
          </div>
        </div>

        <DashboardClient
          initialStats={{
            totalRevenue,
            totalSales: todaySales.length,
            totalProfit,
            totalExpenses,
            salesCount: todaySales.length,
            creditSalesCount,
          }}
          lowStockProducts={lowStockProducts}
          chartData={{
            labels: chartData.map((d) => d.label),
            revenue: chartData.map((d) => d.revenue),
            sales: chartData.map((d) => d.sales),
            expenses: chartData.map((d) => d.expenses),
            profit: chartData.map((d) => d.profit),
          }}
          totalProducts={totalProducts}
          activeStaff={activeStaff}
        />

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Welgama Hardware. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
