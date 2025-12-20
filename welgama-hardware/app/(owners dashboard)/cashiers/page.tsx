// app/(dashboard)/cashiers/page.tsx
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import AddCashierForm from './AddCashierForm'; 
import { Users, CheckCircle2, Calendar } from 'lucide-react';

export default async function CashiersPage() {
  const session = await auth();
  if (session?.user?.role !== 'Owner') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100">
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
  });

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400 opacity-10 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-400 opacity-10 blur-3xl"></div>
      </div>

      <div className="relative max-w-6xl mx-auto ">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Manage Cashiers
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 ml-0 sm:ml-16">Add and manage staff members with cashier access</p>
        </div>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-2">
          {/* LEFT SIDE: The Client Component Form */}
          <AddCashierForm />

          {/* RIGHT SIDE: The List (Stays on Server) */}
          <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-2xl shadow-blue-500/10 border border-white/20 h-fit">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-linear-to-br from-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/30">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Existing Staff</h2>
            </div>
            
            {cashiers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No cashiers found.</p>
                <p className="text-sm text-gray-400 mt-1">Add your first cashier using the form</p>
              </div>
            ) : (
              <ul className="space-y-2 sm:space-y-3">
                {cashiers.map((user) => (
                  <li key={user.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0 bg-white/50 p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200/50 hover:shadow-md hover:border-blue-300/50 transition-all duration-200">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-linear-to-br from-blue-100 to-indigo-100">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm sm:text-base text-gray-900">{user.username}</span>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>Added: {user.createdAt.toLocaleDateString()}</span>
                          <span>{user.createdAt.toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs bg-linear-to-r from-green-50 to-emerald-50 text-green-700 rounded-full border border-green-200 font-medium self-start sm:self-auto">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </div>
                  </li>
                ))}
              </ul>
            )}
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