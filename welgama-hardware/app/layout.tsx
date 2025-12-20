// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers'; // <--- 1. Import this

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Welgama Hardware',
  description: 'Inventory System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 2. Wrap the children with Providers */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}