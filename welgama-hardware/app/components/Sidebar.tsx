// app/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LayoutDashboard, ShoppingCart, Package, Users, LogOut, X, Box, BookOpen, FileText, Receipt, ClipboardList, DollarSign } from 'lucide-react';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Get role directly from session to ensure it updates
  const userRole = session?.user?.role || 'Cashier';

  // 1. Define the Common Links (Visible to Everyone)
  const menuItems = [
    { 
      name: 'Point of Sale', 
      href: '/pos', 
      icon: ShoppingCart 
    },
    { 
      name: 'Orders', 
      href: '/orders', 
      icon: Receipt 
    },
    { 
      name: 'Drafts', 
      href: '/drafts', 
      icon: FileText 
    },
    { 
      name: 'Inventory', 
      href: '/inventory', 
      icon: Package 
    },
    { 
      name: 'Books (Credit)', 
      href: '/books', 
      icon: BookOpen 
    },
    { 
      name: 'Other Expenses', 
      href: '/expenses', 
      icon: DollarSign 
    },
  ];

  // 2. Add specific links ONLY if the user is an Owner
  if (userRole === 'Owner') {
    // Add "Dashboard" to the very top
    menuItems.unshift({ 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: LayoutDashboard 
    });

    // Owner-only utilities
    menuItems.push(
      {
        name: 'Logs',
        href: '/logs',
        icon: ClipboardList,
      },
      { 
        name: 'Manage Staff', 
        href: '/cashiers', 
        icon: Users 
      }
    );
  }

  return (
    <>
      {/* Overlay for mobile/tablet */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full w-full flex-col">
          {/* Header with Brand and Close Button */}
          <div className="flex h-20 items-center justify-between border-b border-gray-200 bg-linear-to-r from-blue-600 to-indigo-600 px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-lg">
                <Box className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Welgama Hardware</h1>
                <p className="text-xs text-blue-100">Inventory System</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Dynamic Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Navigation</p>
            {menuItems.map((item: any) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-white' : 'text-gray-500'} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Sign Out Button */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow-md"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Welgama Hardware
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}