import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import POSClient from './POSClient';
import { redirect } from 'next/navigation';

export default async function POSPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Fetch products with stock
  const productsRaw = await prisma.product.findMany({
    where: {
      quantity: {
        gt: 0,
      },
    },
    select: {
      id: true,
      name: true,
      sellingPrice: true,
      costPrice: true,
      quantity: true,
      unit: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Convert Decimal to number
  const products = productsRaw.map(p => ({
    ...p,
    sellingPrice: Number(p.sellingPrice),
    costPrice: Number(p.costPrice),
    quantity: Number(p.quantity),
  }));

  return <POSClient products={products} session={session} />;
}
