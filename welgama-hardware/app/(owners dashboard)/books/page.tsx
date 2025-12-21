import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import BooksClient from './BooksClient';
import { redirect } from 'next/navigation';

export default async function BooksPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Fetch customers with credit balance
  const customers = await prisma.customer.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  // Fetch all credit sales
  const creditSales = await prisma.sale.findMany({
    where: {
      paymentStatus: {
        in: ['Credit', 'Partial'],
      },
    },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
      payments: true,
    },
    orderBy: {
      date: 'desc',
    },
  });

  return <BooksClient customers={customers} creditSales={creditSales} session={session} />;
}
