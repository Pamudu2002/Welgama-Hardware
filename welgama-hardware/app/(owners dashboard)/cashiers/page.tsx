// app/(dashboard)/cashiers/page.tsx
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import AddCashierForm from './AddCashierForm'; 
import CashiersList from './CashiersList';
import { Users } from 'lucide-react';

export default async function CashiersPage() {
  const session = await auth();
  if (session?.user?.role !== 'Owner') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-2xl shadow-red-500/10 border border-white/20">
          <p className="text-red-600 font-semibold">Access Denied</p>
        </div>
      </div>
    );
  }

  // Fetch the data
  const cashiers = await prisma.user.findMany({
    where: { role: 'Cashier' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      active: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400 opacity-10 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-400 opacity-10 blur-3xl"></div>
      </div>

      <div className="relative max-w-6xl mx-auto ">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Manage Cashiers
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 ml-0 sm:ml-16">Add and manage staff members with cashier access</p>
        </div>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-2">
          {/* LEFT SIDE: The Client Component Form */}
          <AddCashierForm />

          {/* RIGHT SIDE: The List with toggle functionality */}
          <CashiersList cashiers={cashiers} />
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