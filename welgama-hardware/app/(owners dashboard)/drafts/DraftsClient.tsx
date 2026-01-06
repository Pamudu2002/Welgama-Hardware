'use client';

import { useState, useTransition } from 'react';
import { FileText, Trash2, Calendar, User, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteDraft } from '@/lib/action';
import { useAlert } from '@/app/components/AlertProvider';
import { Spinner } from '@/app/components/Loading';

type Draft = {
  id: number;
  userId: number;
  customerId: number | null;
  items: string;
  createdAt: string;
  updatedAt: string;
};

type Customer = {
  id: number;
  name: string;
};

type DraftsClientProps = {
  drafts: Draft[];
  customers: Customer[];
};

const formatCurrency = (value: number) =>
  `Rs.${value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function DraftsClient({ drafts, customers }: DraftsClientProps) {
  const router = useRouter();
  const { showAlert, showConfirm } = useAlert();
  const [isPending, startTransition] = useTransition();

  const handleLoadDraft = (draft: Draft) => {
    // Store draft in localStorage and redirect to POS
    localStorage.setItem('loadDraft', JSON.stringify({
      customerId: draft.customerId,
      items: JSON.parse(draft.items),
      draftId: draft.id,
    }));
    router.push('/pos');
  };

  const handleDeleteDraft = async (draftId: number) => {
    const confirmed = await showConfirm(
      'Delete Draft',
      'Are you sure you want to delete this draft? This action cannot be undone.'
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteDraft(draftId);
      if (result.success) {
        showAlert('success', 'Draft Deleted!', result.message);
        window.location.reload();
      } else {
        showAlert('error', 'Failed', result.message);
      }
    });
  };

  const getCustomerName = (customerId: number | null) => {
    if (!customerId) return 'Walk-in Customer';
    return customers.find((c: any) => c.id === customerId)?.name || 'Unknown';
  };

  const getItemsCount = (itemsJson: string) => {
    try {
      const items = JSON.parse(itemsJson);
      return Array.isArray(items) ? items.length : 0;
    } catch {
      return 0;
    }
  };

  const getTotalAmount = (itemsJson: string) => {
    try {
      const items = JSON.parse(itemsJson);
      if (!Array.isArray(items)) return 0;
      return items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
    } catch {
      return 0;
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
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Saved Drafts
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Load and manage saved carts</p>
            </div>
          </div>
        </div>

        {drafts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">No saved drafts</p>
            <p className="text-gray-400 text-sm mt-2">Save carts from POS to access them later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.map((draft: any) => (
              <div
                key={draft.id}
                className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all cursor-pointer border border-gray-200 hover:border-blue-500"
                onClick={() => handleLoadDraft(draft)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Draft #{draft.id}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(draft.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDraft(draft.id);
                    }}
                    disabled={isPending}
                    className="text-red-500 hover:text-red-700 p-2 disabled:opacity-50"
                  >
                    {isPending ? <Spinner className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{getCustomerName(draft.customerId)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingCart className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{getItemsCount(draft.items)} items</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(getTotalAmount(draft.items))}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadDraft(draft);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    Load Draft
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
