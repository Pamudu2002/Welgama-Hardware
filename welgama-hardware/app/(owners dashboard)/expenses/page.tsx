import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ExpensesClient from './ExpensesClient';

export default async function ExpensesPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return <ExpensesClient session={session} />;
}
