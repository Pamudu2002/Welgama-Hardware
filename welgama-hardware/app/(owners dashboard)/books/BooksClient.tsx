'use client';

import { useState, useMemo, useTransition, useEffect, useRef } from 'react';
import { BookOpen, Search, DollarSign, Calendar, CheckCircle } from 'lucide-react';
import { makePayment } from '@/lib/action';
import { useAlert } from '@/app/components/AlertProvider';
import { ButtonLoader, Spinner } from '@/app/components/Loading';
import { PaginationControls } from '@/app/components/PaginationControls';

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
  session: any;
};

const formatCurrency = (value: number) =>
  `Rs.${value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function BooksClient({ session }: BooksClientProps) {
  const { showAlert } = useAlert();
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedSales, setSelectedSales] = useState<number[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isPending, startTransition] = useTransition();
  const [customerData, setCustomerData] = useState<Customer[]>([]);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<Customer | null>(null);
  const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
  const [salesData, setSalesData] = useState<CreditSale[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const salesRef = useRef<HTMLDivElement>(null);
  const prevLoadingRef = useRef(false);
  const shouldScrollRef = useRef(false);
  const prevPageRef = useRef(1);

  useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomerData([]);
      setIsCustomerSearchLoading(false);
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    const fetchCustomers = async () => {
      setIsCustomerSearchLoading(true);
      try {
        const params = new URLSearchParams({
          search: customerSearch.trim(),
          limit: '25',
        });

        const response = await fetch(`/api/customers?${params}`, { signal: controller.signal });
        if (!response.ok) {
          if (isActive) {
            setCustomerData([]);
          }
          return;
        }

        const data = await response.json();
        if (isActive) {
          setCustomerData(data.data || []);
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        console.error('Failed to search customers:', error);
        if (isActive) {
          setCustomerData([]);
        }
      } finally {
        if (isActive) {
          setIsCustomerSearchLoading(false);
        }
      }
    };

    fetchCustomers();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [customerSearch]);

  // Fetch credit sales with pagination
  useEffect(() => {
    const fetchSales = async () => {
      setIsLoadingSales(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '20',
          ...(searchTerm && { search: searchTerm }),
        });

        const response = await fetch(`/api/books?${params}`);
        if (response.ok) {
          const data = await response.json();
          setSalesData(data.data);
          setTotalPages(data.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch sales:', error);
        showAlert('error', 'Failed to load credit sales');
      } finally {
        setIsLoadingSales(false);
      }
    };

    fetchSales();
  }, [currentPage, searchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomerDetails(customer);
    setSelectedSales([]);
    setCustomerSearch('');
    setCustomerData([]);
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomerId(null);
    setSelectedCustomerDetails(null);
    setSelectedSales([]);
    setCustomerSearch('');
    setCustomerData([]);
  };

  // Track page changes
  useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      shouldScrollRef.current = true;
      prevPageRef.current = currentPage;
    }
  }, [currentPage]);

  // Scroll to top of sales list when page changes (after data loads)
  useEffect(() => {
    // Scroll when loading changes from true to false AND we should scroll
    if (prevLoadingRef.current && !isLoadingSales && shouldScrollRef.current && salesRef.current) {
      salesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      shouldScrollRef.current = false;
    }
    prevLoadingRef.current = isLoadingSales;
  }, [isLoadingSales]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Get sales for selected customer
  const customerSales = useMemo(() => {
    if (!selectedCustomerId) return [];
    return salesData.filter((sale: any) => sale.customer?.id === selectedCustomerId);
  }, [selectedCustomerId, salesData]);

  // Calculate selected total
  const selectedTotal = useMemo(() => {
    return customerSales
      .filter((sale: any) => selectedSales.includes(sale.id))
      .reduce((sum: number, sale: any) => {
        const paid = sale.payments.reduce((p: number, payment: any) => p + Number(payment.amount), 0);
        return sum + (Number(sale.totalAmount) - paid);
      }, 0);
  }, [customerSales, selectedSales]);

  // Toggle sale selection
  const toggleSale = (saleId: number) => {
    if (selectedSales.includes(saleId)) {
      setSelectedSales(selectedSales.filter((id: number) => id !== saleId));
    } else {
      setSelectedSales([...selectedSales, saleId]);
    }
  };

  // Select all sales
  const selectAll = () => {
    const unpaidSales = customerSales.filter((sale: any) => {
      const paid = sale.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      return Number(sale.totalAmount) > paid;
    });
    setSelectedSales(unpaidSales.map((s: any) => s.id));
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
        const currentBalance = selectedCustomerDetails ? Number(selectedCustomerDetails.balance) || 0 : 0;
        const appliedAmount = result.appliedAmount ?? Math.min(amount, selectedTotal);
        const change = result.change ?? Math.max(amount - appliedAmount, 0);
        const updatedBalance = result.remainingBalance ?? Math.max(currentBalance - appliedAmount, 0);

        setSalesData((prevSales) => {
          const saleMap = new Map(prevSales.map((sale: any) => [
            sale.id,
            { ...sale, payments: [...sale.payments] },
          ]));
          let remaining = appliedAmount;
          const timestamp = Date.now();

          // Sort selected sales by date (earliest first) to match backend processing
          const sortedSelectedSales = selectedSales
            .map((id: number) => saleMap.get(id))
            .filter((sale: any) => sale !== undefined)
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((sale: any) => sale.id);

          sortedSelectedSales.forEach((saleId: any, idx: number) => {
            if (remaining <= 0) return;
            const sale = saleMap.get(saleId);
            if (!sale) return;

            const paid = sale.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
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

          return prevSales.map((sale: any) => saleMap.get(sale.id) || sale);
        });

        setCustomerData((prev) =>
          prev.map((customer: any) =>
            customer.id === selectedCustomerId
              ? { ...customer, balance: updatedBalance }
              : customer
          )
        );

        setSelectedCustomerDetails((prev) =>
          prev && prev.id === selectedCustomerId
            ? { ...prev, balance: updatedBalance }
            : prev
        );

        const changeSegment = change > 0 ? ` • Change ${formatCurrency(change)}` : '';
        showAlert(
          'success',
          'Payment Successful',
          `Paid ${formatCurrency(appliedAmount)}${changeSegment} • Remaining Due ${formatCurrency(updatedBalance)}`
        );

        setSelectedSales([]);
        setPaymentAmount('');
      } else {
        showAlert('error', 'Payment Failed', result.message);
      }
    });
  };

  const remainingBalance = selectedCustomerDetails ? Math.max(Number(selectedCustomerDetails.balance) || 0, 0) : 0;

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
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Customer Books (Credit Sales)
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage credit sales and customer payments</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Customer Selection */}
          <div className="space-y-6">
            {/* Customer Search & Select */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Customer</h2>
              <div className="space-y-4">
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

                {customerSearch.trim() !== '' && (
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 shadow-inner bg-gradient-to-b from-gray-50 to-white">
                    {isCustomerSearchLoading ? (
                    <div className="p-6 text-center">
                      <Spinner className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-sm text-gray-600 font-medium">Searching customers...</p>
                    </div>
                  ) : customerData.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 font-medium">No customers found</p>
                      <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {customerData.map((customer: any, index: number) => (
                        <button
                          key={customer.id}
                          onClick={() => handleSelectCustomer(customer)}
                          className={`w-full text-left p-4 flex items-center gap-3 transition-all duration-200 group ${
                            selectedCustomerId === customer.id 
                              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500' 
                              : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30 hover:shadow-sm'
                          } ${index === 0 ? 'rounded-t-xl' : ''} ${index === customerData.length - 1 ? 'rounded-b-xl' : ''}`}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                            selectedCustomerId === customer.id
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30'
                              : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-indigo-100'
                          }`}>
                            <Search className={`h-5 w-5 ${
                              selectedCustomerId === customer.id ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold truncate ${
                              selectedCustomerId === customer.id ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {customer.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-gray-500 truncate">
                                {customer.phone || 'No phone available'}
                              </p>
                              {Number(customer.balance) > 0 && (
                                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex-shrink-0">
                                  Due: {formatCurrency(Number(customer.balance))}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  </div>
                )}
              </div>

              {selectedCustomerDetails && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Selected Customer</p>
                    <p className="font-semibold text-gray-900">{selectedCustomerDetails.name}</p>
                    <p className="text-xs text-gray-500">Balance: {formatCurrency(remainingBalance)}</p>
                  </div>
                  <button
                    onClick={clearSelectedCustomer}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Change
                  </button>
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
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedTotal)}</p>
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
                        {formatCurrency(parseFloat(paymentAmount) - selectedTotal)}
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
            <div ref={salesRef} className="bg-white rounded-2xl shadow-xl overflow-hidden relative">
              {/* Loading Overlay */}
              {isLoadingSales && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-600 font-medium">Loading credit sales...</p>
                  </div>
                </div>
              )}
              <div className="p-6">
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

                {/* Search bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by customer name or phone..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {isLoadingSales ? (
                  <div className="flex justify-center py-12">
                    <Spinner className="h-8 w-8 text-blue-600" />
                  </div>
                ) : !selectedCustomerId ? (
                  <p className="text-gray-500 text-center py-8">Please select a customer to view their credit sales</p>
                ) : customerSales.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No credit sales found for this customer</p>
                ) : (
                  <div className="space-y-4">
                    {customerSales.map((sale: any) => {
                    const totalPaid = sale.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
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
                                  {formatCurrency(Number(sale.totalAmount))}
                                </p>
                              </div>
                            </div>

                            {/* Items */}
                            <div className="bg-gray-50 rounded p-3 mb-2">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Items:</p>
                              {sale.items && sale.items.length > 0 ? (
                                sale.items.map((item: any, idx: number) => (
                                  <div key={idx} className="text-xs text-gray-600 flex justify-between">
                                    <span>
                                      {item.product.name} x {item.quantity} {item.product.unit}
                                    </span>
                                    <span>{formatCurrency(Number(item.subtotal))}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-gray-500 italic">No items available</p>
                              )}
                            </div>

                            {/* Payment info */}
                            <div className="flex justify-between items-center text-sm">
                              <div>
                                {totalPaid > 0 && (
                                  <p className="text-green-600">Paid: {formatCurrency(totalPaid)}</p>
                                )}
                                {isFullyPaid ? (
                                  <p className="text-green-600 font-semibold">✓ Fully Paid</p>
                                ) : (
                                  <p className="text-red-600 font-semibold">Due: {formatCurrency(amountDue)}</p>
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

              {/* Pagination Controls */}
              {!isLoadingSales && salesData.length > 0 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  isLoading={isLoadingSales}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
