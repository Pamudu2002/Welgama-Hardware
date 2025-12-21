'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { Search, Plus, Minus, X, ShoppingCart, User, Percent, DollarSign, BookOpen, CheckCircle, Save } from 'lucide-react';
import { completeSale, addToBook, createCustomer, saveDraft } from '@/lib/action';
import { useAlert } from '@/app/components/AlertProvider';
import { ButtonLoader, Spinner } from '@/app/components/Loading';

type Product = {
  id: number;
  name: string;
  sellingPrice: number;
  quantity: number;
  unit: string;
};

type Customer = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
};

type CartItem = {
  productId: number;
  productName: string;
  originalPrice: number;
  price: number;
  quantity: number;
  unit: string;
  discount: number;
  discountType: 'amount' | 'percentage';
  subtotal: number;
};

type POSClientProps = {
  products: Product[];
  customers: Customer[];
  session: any;
};

const formatCurrency = (value: number) =>
  `Rs.${value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function POSClient({ products, customers: initialCustomers, session }: POSClientProps) {
  const { showAlert } = useAlert();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<null | 'complete' | 'book' | 'draft' | 'customer'>(null);
  const [customers, setCustomers] = useState(initialCustomers);
  const [loadedDraftId, setLoadedDraftId] = useState<number | null>(null);
  
  // Payment input state
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [isDelivered, setIsDelivered] = useState(true);

  // Add to cart form state
  const [addItemForm, setAddItemForm] = useState<{
    product: Product | null;
    quantity: number;
    price: number;
    discount: number;
    discountType: 'amount' | 'percentage';
  }>({
    product: null,
    quantity: 1,
    price: 0,
    discount: 0,
    discountType: 'amount',
  });

  // New customer form state
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
  });

  // Load draft from localStorage on mount
  useEffect(() => {
    const loadDraftStr = localStorage.getItem('loadDraft');
    if (loadDraftStr) {
      try {
        const loadDraft = JSON.parse(loadDraftStr);
        setCart(loadDraft.items || []);
        setSelectedCustomer(loadDraft.customerId || null);
        setLoadedDraftId(loadDraft.draftId || null);
        localStorage.removeItem('loadDraft');
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toString() === searchTerm
    ).slice(0, 10);
  }, [products, searchTerm]);

  // Calculate subtotal for add form
  const formSubtotal = useMemo(() => {
    if (!addItemForm.product) return 0;
    const total = addItemForm.price * addItemForm.quantity;
    if (addItemForm.discountType === 'percentage') {
      return total - (total * addItemForm.discount / 100);
    }
    return total - addItemForm.discount;
  }, [addItemForm]);

  // Select product for adding
  const selectProduct = (product: Product) => {
    setAddItemForm({
      product,
      quantity: 1,
      price: product.sellingPrice,
      discount: 0,
      discountType: 'amount',
    });
    setSearchTerm('');
  };

  // Add configured item to cart
  const addToCart = () => {
    if (!addItemForm.product) return;
    
    // Check if quantity exceeds stock
    if (addItemForm.quantity > addItemForm.product.quantity) {
      showAlert('error', 'Insufficient Stock', `Only ${addItemForm.product.quantity} ${addItemForm.product.unit} available in stock!`);
      return;
    }

    const newItem: CartItem = {
      productId: addItemForm.product.id,
      productName: addItemForm.product.name,
      originalPrice: addItemForm.product.sellingPrice,
      price: addItemForm.price,
      quantity: addItemForm.quantity,
      unit: addItemForm.product.unit,
      discount: addItemForm.discount,
      discountType: addItemForm.discountType,
      subtotal: formSubtotal,
    };

    setCart([...cart, newItem]);
    setAddItemForm({
      product: null,
      quantity: 1,
      price: 0,
      discount: 0,
      discountType: 'amount',
    });
  };

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  // Calculate totals
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const totalDiscount = useMemo(() => {
    return cart.reduce((sum, item) => {
      if (item.discountType === 'percentage') {
        return sum + (item.originalPrice * item.quantity * item.discount / 100);
      }
      return sum + item.discount;
    }, 0);
  }, [cart]);
  
  // Calculate change
  const changeAmount = useMemo(() => {
    const paid = parseFloat(amountPaid) || 0;
    const change = paid - cartTotal;
    return change > 0 ? change : 0;
  }, [amountPaid, cartTotal]);

  // Handle complete sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      showAlert('warning', 'Cart is empty!');
      return;
    }
    
    const paid = parseFloat(amountPaid) || 0;
    if (paid < cartTotal) {
      showAlert('warning', 'Insufficient Payment', `Amount paid (${formatCurrency(paid)}) is less than total (${formatCurrency(cartTotal)})`);
      return;
    }

    setLoadingAction('complete');
    startTransition(async () => {
      try {
      const result = await completeSale({
        customerId: selectedCustomer,
        items: cart,
        amountPaid: paid,
        isDelivered: isDelivered,
      });

      if (result.success) {
        showAlert('success', 'Sale Completed!', result.message);
        setCart([]);
        setSelectedCustomer(null);
        setAmountPaid('');
        setIsDelivered(true);
        setLoadedDraftId(null);
      } else {
        showAlert('error', 'Sale Failed', result.message);
      }
      } finally {
        setLoadingAction(null);
      }
    });
  };

  // Handle add to book
  const handleAddToBook = async () => {
    if (cart.length === 0) {
      showAlert('warning', 'Cart is empty!');
      return;
    }
    if (!selectedCustomer) {
      showAlert('warning', 'Customer Required', 'Please select a customer for credit sale!');
      return;
    }

    setLoadingAction('book');
    startTransition(async () => {
      try {
      const result = await addToBook({
        customerId: selectedCustomer,
        items: cart,
        isDelivered,
      });

      if (result.success) {
        showAlert('success', 'Added to Book!', result.message);
        setCart([]);
        setSelectedCustomer(null);
        setAmountPaid('');
        setIsDelivered(true);
        setLoadedDraftId(null);
      } else {
        showAlert('error', 'Failed', result.message);
      }
      } finally {
        setLoadingAction(null);
      }
    });
  };

  // Handle create customer
  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      showAlert('warning', 'Customer name is required!');
      return;
    }

    setLoadingAction('customer');
    startTransition(async () => {
      try {
      const formData = new FormData();
      formData.append('name', newCustomer.name);
      formData.append('phone', newCustomer.phone);
      formData.append('address', newCustomer.address);

      const result = await createCustomer(formData);
      if (result.success && result.customer) {
        showAlert('success', 'Customer Added!', result.message);
        setCustomers([...customers, result.customer]);
        setSelectedCustomer(result.customer.id);
        setNewCustomer({ name: '', phone: '', address: '' });
        setShowNewCustomerForm(false);
      } else {
        showAlert('error', 'Failed', result.message);
      }
      } finally {
        setLoadingAction(null);
      }
    });
  };

  // Handle save as draft
  const handleSaveDraft = async () => {
    if (cart.length === 0) {
      showAlert('warning', 'Cart is empty!');
      return;
    }

    setLoadingAction('draft');
    startTransition(async () => {
      try {
      const result = await saveDraft({
        customerId: selectedCustomer,
        items: cart,
      });

      if (result.success) {
        showAlert('success', 'Draft Saved!', result.message);
        setCart([]);
        setSelectedCustomer(null);
        setLoadedDraftId(null);
      } else {
        showAlert('error', 'Failed', result.message);
      }
      } finally {
        setLoadingAction(null);
      }
    });
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
              <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Point of Sale
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Process sales and manage transactions</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Product Search & Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Products */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Search Products</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by product name or ID..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Product Results */}
              {searchTerm && (
                <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                      <div
                        key={product.id}
                        onClick={() => selectProduct(product)}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">ID: {product.id} | Stock: {product.quantity} {product.unit}</p>
                          </div>
                          <p className="text-lg font-bold text-blue-600">{formatCurrency(product.sellingPrice)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No products found</p>
                  )}
                </div>
              )}
            </div>

            {/* Add to Cart Form */}
            {addItemForm.product && (
              <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-blue-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">{addItemForm.product.name}</h2>
                    <p className="text-sm text-gray-500">{addItemForm.product.unit} | Stock: {addItemForm.product.quantity}</p>
                  </div>
                  <button
                    onClick={() => setAddItemForm({ product: null, quantity: 1, price: 0, discount: 0, discountType: 'amount' })}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Quantity */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Quantity (Press Enter to add)</label>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => setAddItemForm({ ...addItemForm, quantity: Math.max(1, addItemForm.quantity - 1) })}
                        className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        value={addItemForm.quantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAddItemForm({ ...addItemForm, quantity: value === '' ? 0 : parseInt(value) || 0 });
                        }}
                        onBlur={(e) => {
                          if (addItemForm.quantity < 1) {
                            setAddItemForm({ ...addItemForm, quantity: 1 });
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            if (addItemForm.quantity < 1) {
                              setAddItemForm({ ...addItemForm, quantity: 1 });
                            }
                            addToCart();
                          }
                        }}
                        className="w-24 text-center border border-gray-300 rounded px-3 py-2"
                        autoFocus
                      />
                      <button
                        onClick={() => setAddItemForm({ ...addItemForm, quantity: addItemForm.quantity + 1 })}
                        className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Price per unit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={addItemForm.price}
                      onChange={(e) => setAddItemForm({ ...addItemForm, price: parseFloat(e.target.value) || 0 })}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addToCart();
                        }
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-2 mt-1"
                    />
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Discount</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        step="0.01"
                        value={addItemForm.discount}
                        onChange={(e) => setAddItemForm({ ...addItemForm, discount: parseFloat(e.target.value) || 0 })}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addToCart();
                          }
                        }}
                        className="flex-1 border border-gray-300 rounded px-3 py-2"
                        placeholder="0"
                      />
                      <select
                        value={addItemForm.discountType}
                        onChange={(e) => setAddItemForm({ ...addItemForm, discountType: e.target.value as 'amount' | 'percentage' })}
                        className="border border-gray-300 rounded px-3 py-2"
                      >
                        <option value="amount">Rs.</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold text-gray-700">Subtotal:</span>
                      <span className="text-2xl font-bold text-blue-600">{formatCurrency(formSubtotal)}</span>
                    </div>
                    <button
                      onClick={addToCart}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="h-5 w-5" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Cart */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Cart ({cart.length} items)</h2>
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-sm text-gray-500">
                          {item.quantity} {item.unit} × {formatCurrency(item.price)}
                          {item.discount > 0 && (
                            <span className="text-red-600 ml-2">
                              (-{item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">{formatCurrency(item.subtotal)}</span>
                        <button
                          onClick={() => setCart(cart.filter(i => i.productId !== item.productId))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Customer & Checkout */}
          <div className="space-y-6">
            {/* Customer Selection */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer
                </h2>
                <button
                  onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {showNewCustomerForm ? 'Cancel' : '+ New Customer'}
                </button>
              </div>

              {showNewCustomerForm ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Customer Name *"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                  <textarea
                    placeholder="Address"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    rows={2}
                  />
                  <button
                    onClick={handleCreateCustomer}
                    disabled={isPending}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                  >
                    {loadingAction === 'customer' && isPending ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        Adding...
                      </>
                    ) : (
                      'Add Customer'
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Search customer..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                  <select
                    value={selectedCustomer || ''}
                    onChange={(e) => setSelectedCustomer(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Walk-in Customer</option>
                    {filteredCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} {customer.phone ? `- ${customer.phone}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items:</span>
                  <span className="font-medium">{cart.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(cartTotal + totalDiscount)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span className="font-medium">-{formatCurrency(totalDiscount)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-blue-600">{formatCurrency(cartTotal)}</span>
                </div>
              </div>
              
              {/* Payment Input */}
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Amount Paid</label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                {amountPaid && parseFloat(amountPaid) >= cartTotal && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800">Change:</span>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(changeAmount)}</span>
                    </div>
                  </div>
                )}
                
                {/* Delivery Checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="delivered"
                    checked={isDelivered}
                    onChange={(e) => setIsDelivered(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="delivered" className="text-sm font-medium text-gray-700">
                    Mark as Delivered
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <button
                  onClick={handleCompleteSale}
                  disabled={isPending || cart.length === 0}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {loadingAction === 'complete' && isPending ? (
                    <>
                      <Spinner className="h-5 w-5" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Complete Sale
                    </>
                  )}
                </button>
                <button
                  onClick={handleAddToBook}
                  disabled={isPending || cart.length === 0 || !selectedCustomer}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {loadingAction === 'book' && isPending ? (
                    <>
                      <Spinner className="h-5 w-5" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-5 w-5" />
                      Add to Book
                    </>
                  )}
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={isPending || cart.length === 0}
                  className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {loadingAction === 'draft' && isPending ? (
                    <>
                      <Spinner className="h-5 w-5" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Save as Draft
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
