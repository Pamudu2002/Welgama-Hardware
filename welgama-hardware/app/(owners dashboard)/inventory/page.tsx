// app/(dashboard)/inventory/page.tsx
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Fetch all categories for the dropdown
  const categories = await prisma.category.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  // Fetch all units for the dropdown
  const units = await prisma.unit.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return <InventoryClient categories={categories} units={units} session={session} />;
}
