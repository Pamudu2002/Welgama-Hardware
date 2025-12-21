// app/(dashboard)/inventory/page.tsx
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const session = await auth();

  // Fetch real inventory data from database
  const inventoryItems = await prisma.product.findMany({
    include: {
      category: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  // Fetch all categories for the dropdown
  const categories = await prisma.category.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return <InventoryClient inventoryItems={inventoryItems} categories={categories} session={session} />;
}
