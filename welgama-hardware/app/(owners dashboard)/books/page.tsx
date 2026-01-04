import { auth } from '@/auth';
import BooksClient from './BooksClient';
import { redirect } from 'next/navigation';

export default async function BooksPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Initial credit sales will be loaded via API with pagination
  return <BooksClient session={session} />;
}
