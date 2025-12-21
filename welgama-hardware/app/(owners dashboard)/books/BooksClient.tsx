'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { BookOpen, Search, DollarSign, Calendar, CheckCircle } from 'lucide-react';
import { makePayment } from '@/lib/action';
import { useAlert } from '@/app/components/AlertProvider';
import { ButtonLoader, Spinner } from '@/app/components/Loading';

type Customer = {
  id: number;
  name: string;
  phone: string | null;
  balance: any;
};

type CreditSale = {
  id: number;
  date: Date;
  totalAmount: any;
  paymentStatus: string;
  customer: {
    id: number;
    name: string;
  } | null;
  items: {
    id: number;
    quantity: number;
    priceSnapshot: any;
    discount: any;
    discountType: string;
    subtotal: any;
    product: {
      name: string;
      unit: string;
    };
  }[];
  payments: {
    id: number;
    amount: any;
    date: Date;
  }[];
};

type BooksClientProps = {
  customers: Customer[];
  creditSales: CreditSale[];
  session: any;
};

export default function BooksClient({ customers, creditSales, session }: BooksClientProps) {
  const { showAlert } = useAlert();
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedSales, setSelectedSales] = useState<number[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isPending, startTransition] = useTransition();
  const [customerData, setCustomerData] = useState(customers);
  const [salesData, setSalesData] = useState(creditSales);

  useEffect(() => {
    setCustomerData(customers);
  }, [customers]);

  useEffect(() => {
    setSalesData(creditSales);
  }, [creditSales]);

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customerData;
    return customerData.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
    );
  }, [customerData, customerSearch]);

  // Get sales for selected customer
  const customerSales = useMemo(() => {
    if (!selectedCustomerId) return [];
    return salesData.filter(sale => sale.customer?.id === selectedCustomerId);
  }, [selectedCustomerId, salesData]);

  // Calculate selected total
  const selectedTotal = useMemo(() => {
    return customerSales
      .filter(sale => selectedSales.includes(sale.id))
      .reduce((sum, sale) => {
        const paid = sale.payments.reduce((p, payment) => p + Number(payment.amount), 0);
        return sum + (Number(sale.totalAmount) - paid);
      }, 0);
  }, [customerSales, selectedSales]);

  // Toggle sale selection
  const toggleSale = (saleId: number) => {
    if (selectedSales.includes(saleId)) {
      setSelectedSales(selectedSales.filter(id => id !== saleId));
    } else {
      setSelectedSales([...selectedSales, saleId]);
    }
  };

  // Select all sales
  const selectAll = () => {
    const unpaidSales = customerSales.filter(sale => {
      const paid = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      return Number(sale.totalAmount) > paid;
    });
    setSelectedSales(unpaidSales.map(s => s.id));
  };

  // Handle payment
  const handlePayment = async () => {
    if (!selectedCustomerId) {
      showAlert('warning', 'Please select a customer.');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showAlert('warning', 'Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    startTransition(async () => {
      const result = await makePayment({
        customerId: selectedCustomerId,
        saleIds: selectedSales,
        amount: amount,
      });

      if (result.success) {
        const currentBalance = selectedCustomer ? Number(selectedCustomer.balance) || 0 : 0;
        const appliedAmount = result.appliedAmount ?? Math.min(amount, selectedTotal);
        const change = result.change ?? Math.max(amount - appliedAmount, 0);
        const updatedBalance = result.remainingBalance ?? Math.max(currentBalance - appliedAmount, 0);

        setSalesData((prevSales) => {
          const saleMap = new Map(prevSales.map((sale) => [
            sale.id,
            { ...sale, payments: [...sale.payments] },
          ]));
          let remaining = appliedAmount;
          const timestamp = Date.now();

          selectedSales.forEach((saleId, idx) => {
            if (remaining <= 0) return;
            const sale = saleMap.get(saleId);
            if (!sale) return;

            const paid = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            const saleDue = Number(sale.totalAmount) - paid;
            if (saleDue <= 0) return;

            const paymentForSale = Math.min(remaining, saleDue);
            remaining -= paymentForSale;

            sale.payments = [
              ...sale.payments,
              {
                id: timestamp + saleId + idx,
                amount: paymentForSale,
                date: new Date(),
              },
            ];

            const newPaid = paid + paymentForSale;
            sale.paymentStatus = newPaid >= Number(sale.totalAmount) ? 'Paid' : 'Partial';
          });

          return prevSales.map((sale) => saleMap.get(sale.id) || sale);
        });

        setCustomerData((prev) =>
          prev.map((customer) =>
            customer.id === selectedCustomerId
              ? { ...customer, balance: updatedBalance }
              : customer
          )
        );

        const changeSegment = change > 0 ? ` • Change $${change.toFixed(2)}` : '';
        showAlert(
          'success',
          'Payment Successful',
          `Paid $${appliedAmount.toFixed(2)}${changeSegment} • Remaining Due $${updatedBalance.toFixed(2)}`
        );

        setSelectedSales([]);
        setPaymentAmount('');
      } else {
        showAlert('error', 'Payment Failed', result.message);
      }
    });
  };

  const selectedCustomer = customerData.find(c => c.id === selectedCustomerId);
  const remainingBalance = selectedCustomer ? Math.max(Number(selectedCustomer.balance) || 0, 0) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          Customer Books (Credit Sales)
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Customer Selection */}
          <div className="space-y-6">
            {/* Customer Search & Select */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Customer</h2>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customer..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={selectedCustomerId || ''}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value ? parseInt(e.target.value) : null);
                    setSelectedSales([]);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Customer --</option>
                  {filteredCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone ? `- ${customer.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Balance:</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${remainingBalance.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Payment Section */}
            {selectedCustomerId && selectedSales.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Make Payment</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Amount Due:</label>
                    <p className="text-2xl font-bold text-gray-900">${selectedTotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Payment Amount:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Balance/Change Display */}
                  {paymentAmount && parseFloat(paymentAmount) > selectedTotal && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <label className="text-sm text-green-700">Balance to Return:</label>
                      <p className="text-xl font-bold text-green-600">
                        ${(parseFloat(paymentAmount) - selectedTotal).toFixed(2)}
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={handlePayment}
                    disabled={isPending}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:bg-gray-400 flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <>
                        <Spinner className="h-5 w-5" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Process Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Credit Sales List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Credit Sales</h2>
                {customerSales.length > 0 && (
                  <button
                    onClick={selectAll}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Select All Unpaid
                  </button>
                )}
              </div>

              {!selectedCustomerId ? (
                <p className="text-gray-500 text-center py-8">Please select a customer to view their credit sales</p>
              ) : customerSales.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No credit sales found for this customer</p>
              ) : (
                <div className="space-y-4">
                  {customerSales.map((sale) => {
                    const totalPaid = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                    const amountDue = Number(sale.totalAmount) - totalPaid;
                    const isFullyPaid = amountDue <= 0;

                    return (
                      <div
                        key={sale.id}
                        className={`border rounded-lg p-4 ${
                          isFullyPaid ? 'bg-green-50 border-green-200' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {!isFullyPaid && (
                            <input
                              type="checkbox"
                              checked={selectedSales.includes(sale.id)}
                              onChange={() => toggleSale(sale.id)}
                              className="mt-1"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-gray-900">Sale #{sale.id}</p>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(sale.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Total:</p>
                                <p className="text-lg font-bold text-gray-900">
                                  ${Number(sale.totalAmount).toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {/* Items */}
                            <div className="bg-gray-50 rounded p-3 mb-2">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Items:</p>
                              {sale.items.map((item, idx) => (
                                <div key={idx} className="text-xs text-gray-600 flex justify-between">
                                  <span>
                                    {item.product.name} x {item.quantity} {item.product.unit}
                                  </span>
                                  <span>${Number(item.subtotal).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            {/* Payment info */}
                            <div className="flex justify-between items-center text-sm">
                              <div>
                                {totalPaid > 0 && (
                                  <p className="text-green-600">Paid: ${totalPaid.toFixed(2)}</p>
                                )}
                                {isFullyPaid ? (
                                  <p className="text-green-600 font-semibold">✓ Fully Paid</p>
                                ) : (
                                  <p className="text-red-600 font-semibold">Due: ${amountDue.toFixed(2)}</p>
                                )}
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                isFullyPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {sale.paymentStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
