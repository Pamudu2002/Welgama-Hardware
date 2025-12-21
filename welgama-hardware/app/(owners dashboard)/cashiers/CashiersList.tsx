'use client';

import { useState, useTransition } from 'react';
import { Users, CheckCircle2, Calendar, XCircle, Power } from 'lucide-react';
import { toggleUserStatus } from '@/lib/action';
import { useAlert } from '@/app/components/AlertProvider';
import { ButtonLoader } from '@/app/components/Loading';

type Cashier = {
  id: number;
  username: string;
  active: boolean;
  createdAt: Date;
};

type CashiersListProps = {
  cashiers: Cashier[];
};

export default function CashiersList({ cashiers }: CashiersListProps) {
  const { showAlert } = useAlert();
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleToggleStatus = (userId: number, currentStatus: boolean) => {
    setTogglingId(userId);
    startTransition(async () => {
      const result = await toggleUserStatus(userId, currentStatus);
      if (result.success) {
        showAlert('success', 'Status Updated', result.message);
      } else {
        showAlert('error', 'Failed', result.message);
      }
      setTogglingId(null);
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-2xl shadow-blue-500/10 border border-white/20 h-fit">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/30">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Existing Staff</h2>
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
            <li key={user.id} className="flex flex-col gap-3 bg-white/50 p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200/50 hover:shadow-md hover:border-blue-300/50 transition-all duration-200">
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex-shrink-0">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-sm sm:text-base text-gray-900 block truncate">{user.username}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">Added: {user.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {user.active ? (
                  <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs rounded-full bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200 font-medium shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs rounded-full bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200 font-medium shrink-0">
                    <XCircle className="h-3 w-3" />
                    <span>Inactive</span>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => handleToggleStatus(user.id, user.active)}
                disabled={isPending && togglingId === user.id}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  user.active
                    ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                    : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                } disabled:opacity-50`}
              >
                {isPending && togglingId === user.id ? (
                  <>
                    <ButtonLoader />
                    Processing...
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4" />
                    {user.active ? 'Deactivate' : 'Activate'}
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
