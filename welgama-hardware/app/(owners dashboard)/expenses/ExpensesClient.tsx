'use client';

import { useState } from 'react';
import { addExpense } from '@/lib/action';

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
  initialExpenses: ExpenseData[];
  totalAmount: number;
  currentUser: {
    username: string;
    role: string;
  };
}

export default function ExpensesClient({
  initialExpenses,
  totalAmount: initialTotal,
  currentUser,
}: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<ExpenseData[]>(initialExpenses);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalAmount, setTotalAmount] = useState(initialTotal);

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
          id: result.expense.id,
          reason: result.expense.reason,
          amount: Number(result.expense.amount),
          createdAt: result.expense.createdAt,
          user: {
            username: currentUser.username,
            role: currentUser.role,
          },
        };

        setExpenses([newExpense, ...expenses]);
        setTotalAmount(totalAmount + newExpense.amount);
        setReason('');
        setAmount('');
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

  const itemsPerPage = 10;
  const totalPages = Math.ceil(expenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExpenses = expenses.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Other Expenses</h1>

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
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, expenses.length)} of {expenses.length} expenses
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
