import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import DraftsClient from './DraftsClient';

export default async function DraftsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Fetch all drafts for the current user
  const draftsRaw = await prisma.draft.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // Convert to plain objects
  const drafts = draftsRaw.map(d => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  // Fetch all customers for display
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  return <DraftsClient drafts={drafts} customers={customers} />;
}
