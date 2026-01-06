'use client';

import { useRef, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { addProduct, addCategory, addUnit } from '@/lib/action';

type Category = {
  id: number;
  name: string;
};

type Unit = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  categoryId: number;
  costPrice: any;
  sellingPrice: any;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  category: Category;
};

type AddProductFormProps = {
  categories: Category[];
  units: Unit[];
  onSuccess: (product: Product, message?: string) => void;
};

export default function AddProductForm({ categories, units, onSuccess }: AddProductFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [availableUnits, setAvailableUnits] = useState(units);
  const [availableCategories, setAvailableCategories] = useState(categories);
  const formRef = useRef<HTMLFormElement>(null);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setMessage('Please enter a category name');
      return;
    }

    startTransition(async () => {
      const result = await addCategory(newCategoryName.trim());
      if (result.success && result.category) {
        setAvailableCategories([...availableCategories, result.category]);
        setNewCategoryName('');
        setShowNewCategory(false);
        setMessage('Category added successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(result.message || 'Failed to add category');
      }
    });
  };

  const handleAddUnit = () => {
    if (!newUnitName.trim()) {
      setMessage('Please enter a unit name');
      return;
    }

    startTransition(async () => {
      const result = await addUnit(newUnitName.trim());
      if (result.success && result.unit) {
        setAvailableUnits([...availableUnits, result.unit]);
        setNewUnitName('');
        setShowNewUnit(false);
        setMessage('Unit added successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(result.message || 'Failed to add unit');
      }
    });
  };

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await addProduct(formData);
      setMessage(result.message || (result.success ? 'Product added successfully.' : 'Failed to add product.'));

      if (result.success && result.product) {
        formRef.current?.reset();
        setTimeout(() => {
          setMessage('');
          const transformedProduct = {
            ...result.product,
            quantity: Number(result.product.quantity),
            costPrice: Number(result.product.costPrice),
            sellingPrice: Number(result.product.sellingPrice),
          };
          onSuccess(transformedProduct, result.message);
        }, 500);
      }
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/20">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Product</h2>
      
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes('success') || message.includes('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      <form ref={formRef} action={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Product Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter product name"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <div className="flex gap-2">
            <select
              id="categoryId"
              name="categoryId"
              required
              disabled={showNewCategory}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select a category</option>
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewCategory(!showNewCategory)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              {showNewCategory ? 'Cancel' : 'New'}
            </button>
          </div>
          
          {showNewCategory && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Cost Price */}
        <div>
          <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 mb-2">
            Cost Price (Rs.) *
          </label>
          <input
            type="number"
            id="costPrice"
            name="costPrice"
            step="0.01"
            min="0"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        {/* Selling Price */}
        <div>
          <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700 mb-2">
            Selling Price (Rs.) *
          </label>
          <input
            type="number"
            id="sellingPrice"
            name="sellingPrice"
            step="0.01"
            min="0"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
            Quantity *
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            step="0.01"
            min="0"
            required
            defaultValue="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        </div>

        {/* Unit */}
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-2">
            Unit *
          </label>
          <div className="flex gap-2">
            <select
              id="unit"
              name="unit"
              required
              disabled={showNewUnit}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select a unit</option>
              {availableUnits.map((unit) => (
                <option key={unit.id} value={unit.name}>
                  {unit.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewUnit(!showNewUnit)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              {showNewUnit ? 'Cancel' : 'New'}
            </button>
          </div>
          
          {showNewUnit && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                placeholder="New unit (e.g., dozen)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddUnit}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Low Stock Threshold */}
        <div>
          <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700 mb-2">
            Low Stock Alert Threshold *
          </label>
          <input
            type="number"
            id="lowStockThreshold"
            name="lowStockThreshold"
            min="0"
            required
            defaultValue="5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="5"
          />
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Adding Product...' : 'Add Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
