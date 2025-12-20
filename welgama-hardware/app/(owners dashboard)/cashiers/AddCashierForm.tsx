// app/(dashboard)/cashiers/AddCashierForm.tsx
'use client';

import { useActionState } from 'react';
import { createCashier } from '@/lib/action';
import { User, Lock, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

// We need a wrapper to make the type signatures match perfectly
async function handleFormSubmit(prevState: any, formData: FormData) {
  const result = await createCashier(formData);
  return result; // Pass the { message: ... } back to the UI
}

const initialState = { message: '' };

export default function AddCashierForm() {
  const [state, formAction] = useActionState(handleFormSubmit, initialState);

  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-2xl shadow-blue-500/10 border border-white/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
          <UserPlus className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Add New Cashier</h2>
      </div>
      
      <form action={formAction} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">Username</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              name="username" 
              type="text" 
              required
              className="w-full rounded-lg border border-gray-300 bg-white/50 pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" 
              placeholder="Enter cashier username"
            />
          </div>
        </div>
        
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">Password</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              name="password" 
              type="password" 
              required
              className="w-full rounded-lg border border-gray-300 bg-white/50 pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" 
              placeholder="Create password"
            />
          </div>
        </div>

        {/* Display Success or Error Message */}
        {state?.message && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-300 ${
            state.message.includes('Success') 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {state.message.includes('Success') ? (
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            )}
            <p className={`text-sm font-medium ${
              state.message.includes('Success') ? 'text-green-700' : 'text-red-700'
            }`}>
              {state.message}
            </p>
          </div>
        )}

        <button 
          type="submit"
          className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Cashier
          </span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full"></div>
        </button>
      </form>
    </div>
  );
}