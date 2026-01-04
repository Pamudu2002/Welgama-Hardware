import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import OrdersClient from './OrdersClient';

// Orders management page
export default async function OrdersPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  // Data will be fetched via API with pagination
  return <OrdersClient session={session} />;
}

