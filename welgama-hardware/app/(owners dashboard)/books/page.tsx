import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import BooksClient from './BooksClient';
import { redirect } from 'next/navigation';

export default async function BooksPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Fetch customers for the dropdown (not paginated as it's a small list)
  const customers = await prisma.customer.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  // Initial credit sales will be loaded via API with pagination
  return <BooksClient customers={customers} session={session} />;
}
