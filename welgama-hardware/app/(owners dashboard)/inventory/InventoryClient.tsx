'use client';

import { Package, Search, Plus, Filter, X, Edit2, Trash2, Save, Minus } from 'lucide-react';
import { useState, useMemo, useTransition, useEffect, useRef } from 'react';
import AddProductForm from './AddProductForm';
import { deleteProduct, updateProduct } from '@/lib/action';
import { useAlert } from '@/app/components/AlertProvider';
import { ButtonLoader, Spinner } from '@/app/components/Loading';
import { PaginationControls } from '@/app/components/PaginationControls';

type Product = {
  id: number;
  name: string;
  categoryId: number;
  costPrice: any;
  sellingPrice: any;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  category: {
    id: number;
    name: string;
  };
};

type Category = {
  id: number;
  name: string;
};

type Unit = {
  id: number;
  name: string;
};

type InventoryClientProps = {
  categories: Category[];
  units: Unit[];
  session: any;
};

const AVAILABLE_UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'm', 'cm', 'ft'];

const formatCurrency = (value: number) =>
  `Rs.${value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function InventoryClient({ categories, units, session }: InventoryClientProps) {
  const { showAlert, showConfirm } = useAlert();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('last-added');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<Product[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [stats, setStats] = useState({
    totalCount: 0,
    totalCostValue: 0,
    totalSellingValue: 0,
    lowStockCount: 0,
  });
  const tableRef = useRef<HTMLDivElement>(null);
  const prevLoadingRef = useRef(false);
  const shouldScrollRef = useRef(false);
  const prevPageRef = useRef(1);

  // Fetch inventory items from API
  useEffect(() => {
    const fetchItems = async () => {
      setIsLoadingItems(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '20',
          sortBy,
          ...(searchTerm && { search: searchTerm }),
          ...(selectedCategory && { categoryId: selectedCategory }),
          ...(lowStockOnly && { lowStockOnly: 'true' }),
        });

        const response = await fetch(`/api/inventory?${params}`);
        if (response.ok) {
          const data = await response.json();
          setItems(data.data);
          setTotalPages(data.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
        showAlert('error', 'Failed to load inventory items');
      } finally {
        setIsLoadingItems(false);
      }
    };

    fetchItems();
  }, [currentPage, searchTerm, selectedCategory, sortBy, lowStockOnly]);

  // Fetch inventory stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/inventory/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch inventory stats:', error);
      }
    };

    fetchStats();
  }, [items]); // Refetch stats when items change (after add/update/delete)

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
    if (prevLoadingRef.current && !isLoadingItems && shouldScrollRef.current && tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      shouldScrollRef.current = false;
    }
    prevLoadingRef.current = isLoadingItems;
  }, [isLoadingItems]);

  const handleProductAdded = async (product: Product, message?: string) => {
    setShowAddForm(false);
    showAlert('success', 'Product Added!', message || 'Product added successfully!');
    
    // Refetch items to show the new product
    setIsLoadingItems(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '20',
        sortBy,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory && { categoryId: selectedCategory }),
        ...(lowStockOnly && { lowStockOnly: 'true' }),
      });

      const response = await fetch(`/api/inventory?${params}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.data);
        setTotalPages(data.pagination.totalPages);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Failed to refetch inventory:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Items are already filtered and paginated by the API
  const paginatedItems = items;

  // Reset to page 1 when filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleLowStockToggle = () => {
    setLowStockOnly(!lowStockOnly);
    setCurrentPage(1);
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditData({
      name: product.name,
      categoryId: product.categoryId,
      costPrice: Number(product.costPrice),
      sellingPrice: Number(product.sellingPrice),
      quantity: Number(product.quantity),
      unit: product.unit,
      lowStockThreshold: product.lowStockThreshold,
      changeAmount: 1,
      reason: '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSaveEdit = async (productId: number, originalQuantity: number) => {
    // Validate reason is required if quantity changed
    if (editData.quantity !== originalQuantity && !editData.reason?.trim()) {
      showAlert('warning', 'Reason Required', 'Please provide a reason for changing the quantity.');
      return;
    }

    console.log('Edit data being saved:', editData);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('id', productId.toString());
      formData.append('name', editData.name || '');
      formData.append('categoryId', (editData.categoryId || '').toString());
      formData.append('costPrice', (editData.costPrice || 0).toString());
      formData.append('sellingPrice', (editData.sellingPrice || 0).toString());
      formData.append('quantity', (editData.quantity || 0).toString());
      formData.append('unit', editData.unit || '');
      formData.append('lowStockThreshold', (editData.lowStockThreshold || 0).toString());
      formData.append('reason', editData.reason || '');

      console.log('FormData being sent:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      try {
        const result = await updateProduct(formData);
        console.log('Update result:', result);
        
        if (result.success && result.product) {
          // Refetch current page to show updated data
          const params = new URLSearchParams({
            page: currentPage.toString(),
            limit: '20',
            sortBy,
            ...(searchTerm && { search: searchTerm }),
            ...(selectedCategory && { categoryId: selectedCategory }),
            ...(lowStockOnly && { lowStockOnly: 'true' }),
          });
          const response = await fetch(`/api/inventory?${params}`);
          if (response.ok) {
            const data = await response.json();
            setItems(data.data);
            setTotalPages(data.pagination.totalPages);
          }
          showAlert('success', 'Product Updated!', result.message || 'Product updated successfully!');
          setEditingId(null);
          setEditData({});
        } else {
          showAlert('error', 'Update Failed', result.message || 'Failed to update product.');
        }
      } catch (error) {
        console.error('Error updating product:', error);
        showAlert('error', 'Error', 'An error occurred while updating the product.');
      }
    });
  };

  const handleDelete = async (productId: number, productName: string) => {
    const confirmed = await showConfirm(
      'Delete Product',
      `Are you sure you want to delete "${productName}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    
    startTransition(async () => {
      try {
        const result = await deleteProduct(productId);
        if (result.success) {
          // Refetch current page
          const params = new URLSearchParams({
            page: currentPage.toString(),
            limit: '20',
            sortBy,
            ...(searchTerm && { search: searchTerm }),
            ...(selectedCategory && { categoryId: selectedCategory }),
            ...(lowStockOnly && { lowStockOnly: 'true' }),
          });
          const response = await fetch(`/api/inventory?${params}`);
          if (response.ok) {
            const data = await response.json();
            setItems(data.data);
            setTotalPages(data.pagination.totalPages);
          }
          showAlert('success', 'Product Deleted', result.message || 'Product deleted successfully!');
        } else {
          showAlert('error', 'Delete Failed', result.message || 'Failed to delete product.');
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        showAlert('error', 'Error', 'An error occurred while deleting the product.');
      }
    });
  };

  const applyQuantityChange = (amount: number, isAdd: boolean) => {
    const currentQty = editData.quantity || 0;
    const change = isAdd ? amount : -amount;
    const newQuantity = currentQty + change;
    
    if (newQuantity < 0) {
      showAlert('warning', 'Invalid Quantity', 'Quantity cannot be negative.');
      return;
    }
    
    setEditData({
      ...editData,
      quantity: newQuantity,
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Inventory Management
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Track and manage your product stock</p>
              </div>
            </div>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base whitespace-nowrap"
            >
              {showAddForm ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Plus className="h-4 w-4 sm:h-5 sm:w-5" />}
              {showAddForm ? 'Cancel' : 'Add Product'}
            </button>
          </div>
        </div>

        {/* Add Product Form - Slides down */}
        <div 
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            showAddForm ? 'max-h-[800px] opacity-100 mb-6' : 'max-h-0 opacity-0'
          }`}
        >
          <AddProductForm categories={categories} units={units} onSuccess={handleProductAdded} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20">
            <p className="text-sm font-medium text-gray-600">Total Products</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCount}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20">
            <p className="text-sm font-medium text-gray-600">Total Cost Value</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {formatCurrency(stats.totalCostValue)}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20">
            <p className="text-sm font-medium text-gray-600">Total Selling Value</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {formatCurrency(stats.totalSellingValue)}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20">
            <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {stats.lowStockCount}
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20 mb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search products by name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="px-6 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-6 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="last-added">Last Added</option>
                <option value="first-added">First Added</option>
                <option value="alphabetic">Alphabetic (A-Z)</option>
              </select>
            </div>
            <button
              onClick={handleLowStockToggle}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                lowStockOnly
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {lowStockOnly ? '✓ Low Stock' : 'Low Stock'}
            </button>
          </div>
        </div>

        {/* Inventory Table */}
        <div ref={tableRef} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20 overflow-hidden relative">
          {/* Loading Overlay */}
          {isLoadingItems && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600 font-medium">Loading inventory...</p>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Cost Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Selling Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Low Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                    {editingId === item.id ? (
                      // Edit Mode
                      <>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.id}</td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={editData.categoryId}
                            onChange={(e) => setEditData({ ...editData, categoryId: parseInt(e.target.value) })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {categories.map((cat: any) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={editData.costPrice}
                            onChange={(e) => setEditData({ ...editData, costPrice: parseFloat(e.target.value) })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={editData.sellingPrice}
                            onChange={(e) => setEditData({ ...editData, sellingPrice: parseFloat(e.target.value) })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-700">Current: {item.quantity}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">New:</span>
                              <span className="font-semibold">{editData.quantity}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={editData.changeAmount || 1}
                                onChange={(e) => setEditData({ ...editData, changeAmount: parseFloat(e.target.value) || 1 })}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => applyQuantityChange(editData.changeAmount || 1, false)}
                                className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                title="Subtract"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => applyQuantityChange(editData.changeAmount || 1, true)}
                                className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                title="Add"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Reason (required if quantity changed) *"
                              value={editData.reason || ''}
                              onChange={(e) => setEditData({ ...editData, reason: e.target.value })}
                              className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                editData.quantity !== item.quantity && !editData.reason?.trim() 
                                  ? 'border-red-500' 
                                  : 'border-gray-300'
                              }`}
                            />
                            {editData.quantity !== item.quantity && (
                              <span className="text-xs font-semibold text-blue-600">
                                Change: {editData.quantity > item.quantity ? '+' : ''}{editData.quantity - item.quantity}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={editData.unit}
                            onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {AVAILABLE_UNITS.map((unit: string) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={editData.lowStockThreshold}
                            onChange={(e) => setEditData({ ...editData, lowStockThreshold: parseInt(e.target.value) })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveEdit(item.id, item.quantity)}
                              disabled={isPending}
                              className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                              title="Save"
                            >
                              {isPending ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      // View Mode
                      <>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                              <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-900">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                            {item.category.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formatCurrency(Number(item.costPrice))}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formatCurrency(Number(item.sellingPrice))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${item.quantity < item.lowStockThreshold ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.lowStockThreshold}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              disabled={isPending}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {isPending ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination - Show if we have pages (keep visible during loading) */}
          {totalPages > 0 && (
            <div className="border-t border-gray-200 px-4 py-3 bg-white/80">
              <PaginationControls
                currentPage={currentPage}
                totalPages={Math.max(1, totalPages)}
                onPageChange={setCurrentPage}
                isLoading={isLoadingItems}
              />
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Logged in as <strong>{session?.user?.name || 'User'}</strong> ({session?.user?.role})
          </p>
        </div>
      </div>
    </div>
  );
}
