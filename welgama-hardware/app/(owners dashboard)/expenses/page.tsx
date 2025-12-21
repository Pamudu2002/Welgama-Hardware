import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import ExpensesClient from './ExpensesClient';

const PAGE_SIZE = 20;

export default async function ExpensesPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Get current user's username
  const currentUser = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { username: true, role: true },
  });

  const expenses = await prisma.expense.findMany({
    take: PAGE_SIZE,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
        },
      },
    },
  });

  const totalExpenses = await prisma.expense.aggregate({
    _sum: {
      amount: true,
    },
  });

  return (
    <ExpensesClient
      initialExpenses={expenses.map((exp) => ({
        id: exp.id,
        reason: exp.reason,
        amount: Number(exp.amount),
        createdAt: exp.createdAt.toISOString(),
        user: {
          username: exp.user.username,
          role: exp.user.role,
        },
      }))}
      totalAmount={Number(totalExpenses._sum.amount || 0)}
      currentUser={{
        username: currentUser?.username || 'Unknown',
        role: currentUser?.role || '',
      }}
    />
  );
}
