// app/(dashboard)/layout.tsx
'use client';

import { useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Menu } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    },
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (status === "loading") return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="flex h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100">
      
      {/* Sidebar - Always Hidden, Opens on Toggle */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toggle Button - Fixed Position with responsive spacing */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-30 rounded-xl bg-white p-2.5 text-gray-700 shadow-lg hover:bg-gray-50 hover:shadow-xl transition-all duration-200 ring-1 ring-gray-200 md:top-6 md:left-6 md:p-3"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 md:h-6 md:w-6" />
        </button>

        <main className="flex-1 overflow-y-auto pt-16 px-4 pb-4 md:p-8 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}