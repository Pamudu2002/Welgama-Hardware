'use client';

import { Package, Search, Plus, Filter, X, Edit2, Trash2, Save, Minus } from 'lucide-react';
import { useState, useMemo, useTransition, useEffect } from 'react';
import AddProductForm from './AddProductForm';
import { deleteProduct, updateProduct } from '@/lib/action';
import { useAlert } from '@/app/components/AlertProvider';
import { ButtonLoader, Spinner } from '@/app/components/Loading';

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

type InventoryClientProps = {
  inventoryItems: Product[];
  categories: Category[];
  session: any;
};

const AVAILABLE_UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'm', 'cm', 'ft'];

const formatCurrency = (value: number) =>
  `Rs.${value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function InventoryClient({ inventoryItems, categories, session }: InventoryClientProps) {
  const { showAlert, showConfirm } = useAlert();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('last-added');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isPending, startTransition] = useTransition();
  const itemsPerPage = 10;
  const [items, setItems] = useState(inventoryItems);

  useEffect(() => {
    setItems(inventoryItems);
  }, [inventoryItems]);

  const ensureValidPage = (nextLength: number) => {
    const totalPages = Math.max(1, Math.ceil(Math.max(nextLength, 1) / itemsPerPage));
    setCurrentPage(prev => Math.min(prev, totalPages));
  };

  const handleProductAdded = (product: Product, message?: string) => {
    setItems(prev => [product, ...prev.filter(item => item.id !== product.id)]);
    setShowAddForm(false);
    setCurrentPage(1);
    showAlert('success', 'Product Added!', message || 'Product added successfully!');
  };

  // Filter and search logic
  const filteredItems = useMemo(() => {
    let list = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === '' || item.categoryId.toString() === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Apply sorting
    switch (sortBy) {
      case 'last-added':
        list.sort((a, b) => b.id - a.id);
        break;
      case 'first-added':
        list.sort((a, b) => a.id - b.id);
        break;
      case 'alphabetic':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return list;
  }, [items, searchTerm, selectedCategory, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  // Reset to page 1 when filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditData({
      name: product.name,
      categoryId: product.categoryId,
      costPrice: Number(product.costPrice),
      sellingPrice: Number(product.sellingPrice),
      quantity: product.quantity,
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
          setItems(prev => prev.map(item => (item.id === productId ? result.product : item)));
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
          setItems(prev => {
            const next = prev.filter(item => item.id !== productId);
            ensureValidPage(next.length);
            return next;
          });
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
          <AddProductForm categories={categories} onSuccess={handleProductAdded} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20">
            <p className="text-sm font-medium text-gray-600">Total Products</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{items.length}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20">
            <p className="text-sm font-medium text-gray-600">Total Cost</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {formatCurrency(items.reduce((acc, item) => acc + (Number(item.costPrice) * item.quantity), 0))}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20">
            <p className="text-sm font-medium text-gray-600">Total Selling Price</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {formatCurrency(items.reduce((acc, item) => acc + (Number(item.sellingPrice) * item.quantity), 0))}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20">
            <p className="text-sm font-medium text-gray-600">Low Stock</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {items.filter(item => item.quantity < item.lowStockThreshold).length}
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
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20 overflow-hidden">
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
                {paginatedItems.map((item) => (
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
                            {categories.map((cat) => (
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
                                min="1"
                                value={editData.changeAmount || 1}
                                onChange={(e) => setEditData({ ...editData, changeAmount: parseInt(e.target.value) || 1 })}
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
                            {AVAILABLE_UNITS.map((unit) => (
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

          {/* Pagination */}
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between bg-white/80">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredItems.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredItems.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
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
