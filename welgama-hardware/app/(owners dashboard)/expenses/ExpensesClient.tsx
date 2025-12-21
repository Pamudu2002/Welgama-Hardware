'use client';

import { useState, useEffect, useRef } from 'react';
import { addExpense } from '@/lib/action';
import { PaginationControls } from '@/app/components/PaginationControls';

interface ExpenseData {
  id: string;
  reason: string;
  amount: number;
  createdAt: string;
  user: {
    username: string;
    role: string;
  };
}

interface ExpensesClientProps {
  session: any;
}

export default function ExpensesClient({ session }: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const prevLoadingRef = useRef(false);
  const shouldScrollRef = useRef(false);
  const prevPageRef = useRef(1);

  // Fetch expenses from API
  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoadingExpenses(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '20',
        });

        const response = await fetch(`/api/expenses?${params}`);
        if (response.ok) {
          const data = await response.json();
          setExpenses(
            data.data.map((exp: any) => ({
              id: String(exp.id),
              reason: exp.reason,
              amount: Number(exp.amount),
              createdAt: exp.createdAt,
              user: {
                username: exp.user.username,
                role: exp.user.role,
              },
            }))
          );
          setTotalPages(data.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch expenses:', error);
      } finally {
        setIsLoadingExpenses(false);
      }
    };

    fetchExpenses();
  }, [currentPage]);

  // Fetch total amount
  useEffect(() => {
    const fetchTotal = async () => {
      try {
        const response = await fetch('/api/expenses/total');
        if (response.ok) {
          const data = await response.json();
          setTotalAmount(data.total);
        }
      } catch (error) {
        console.error('Failed to fetch total:', error);
      }
    };

    fetchTotal();
  }, []);

  // Track page changes
  useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      shouldScrollRef.current = true;
      prevPageRef.current = currentPage;
    }
  }, [currentPage]);

  // Scroll to top of table when page changes (after data loads)
  useEffect(() => {
    // Scroll when loading changes from true to false AND we should scroll
    if (prevLoadingRef.current && !isLoadingExpenses && shouldScrollRef.current && tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      shouldScrollRef.current = false;
    }
    prevLoadingRef.current = isLoadingExpenses;
  }, [isLoadingExpenses]);

  const formatCurrency = (value: number) => {
    return `Rs. ${value.toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim() || !amount || Number(amount) <= 0) {
      alert('Please enter a valid reason and amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addExpense({
        reason: reason.trim(),
        amount: Number(amount),
      });

      if (result.success && result.expense) {
        const newExpense: ExpenseData = {
          id: String(result.expense.id),
          reason: result.expense.reason,
          amount: Number(result.expense.amount),
          createdAt: result.expense.createdAt,
          user: {
            username: session?.user?.name || 'Unknown',
            role: 'owner',
          },
        };

        // Add to top of list and update total
        setExpenses([newExpense, ...expenses]);
        setTotalAmount(totalAmount + newExpense.amount);
        setReason('');
        setAmount('');
        
        // Go to first page to see the new expense
        if (currentPage !== 1) {
          setCurrentPage(1);
        }
      } else {
        alert(result.message || 'Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('An error occurred while adding the expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentExpenses = expenses;

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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Other Expenses
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Track and manage business expenses</p>
            </div>
          </div>
        </div>

        {/* Add Expense Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Expense</h2>
          <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <input
              type="text"
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter reason for expense"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount (Rs.)
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Total Expenses:</span>
          <span className="text-2xl font-bold text-blue-700">{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div ref={tableRef} className="bg-white rounded-lg shadow-md overflow-hidden relative">
        {/* Loading Overlay */}
        {isLoadingExpenses && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600 font-medium">Loading expenses...</p>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentExpenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No expenses recorded yet
                  </td>
                </tr>
              ) : (
                currentExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.createdAt).toLocaleString('en-LK', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{expense.user.username}</div>
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {expense.user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {expense.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            isLoading={isLoadingExpenses}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
