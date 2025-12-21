// app/(dashboard)/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { LayoutDashboard, DollarSign, ShoppingCart, Package, Users, TrendingUp, TrendingDown } from 'lucide-react';

export default async function DashboardPage() {
  const session = await auth();
  
  if (session?.user?.role !== 'Owner') {
    redirect('/pos');
  }

  // Mock dashboard data
  const stats = [
    { 
      title: "Today's Revenue", 
      value: 'Rs.0.00', 
      change: '+0%', 
      trending: 'up',
      icon: DollarSign,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    { 
      title: 'Total Sales', 
      value: '0', 
      change: '+0%', 
      trending: 'up',
      icon: ShoppingCart,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    { 
      title: 'Products in Stock', 
      value: '0', 
      change: '-0%', 
      trending: 'down',
      icon: Package,
      bgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-600'
    },
    { 
      title: 'Active Staff', 
      value: '0', 
      change: '+0%', 
      trending: 'up',
      icon: Users,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
  ];

  const recentTransactions = [
    { id: 1, customer: 'Walk-in Customer', amount: 0, items: 0, date: 'No transactions yet' },
  ];

  return (
    <div className="min-h-screen">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400 opacity-10 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-400 opacity-10 blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
              <LayoutDashboard className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Owner Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Welcome back, {session?.user?.name || 'Owner'}!</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trending === 'up' ? TrendingUp : TrendingDown;
            
            return (
              <div key={index} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20 hover:shadow-2xl transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    stat.trending === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <TrendIcon className="h-3 w-3" />
                    {stat.change}
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Sales Chart */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Sales Overview</h2>
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <TrendingUp className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">Sales Chart Coming Soon</p>
                <p className="text-sm mt-2">Track your daily, weekly, and monthly sales</p>
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
              <a href="/cashiers" className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
                <Users className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-gray-900">Manage Staff</span>
              </a>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-linear-to-r from-blue-50 to-indigo-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{transaction.customer}</td>
                    <td className="px-6 py-4 text-gray-600">{transaction.items}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">${transaction.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{transaction.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
