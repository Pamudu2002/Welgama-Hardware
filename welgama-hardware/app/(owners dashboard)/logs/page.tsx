import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import LogsClient from './LogsClient';
import type { ActivityLogEntry } from './types';

const PAGE_SIZE = 20;

export default async function LogsPage() {
  const session = await auth();

  if (session?.user?.role !== 'Owner') {
    redirect('/pos');
  }

  // Fetch initial logs
  const logs = await prisma.activityLog.findMany({
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

  // Get total count of all logs
  const totalCount = await prisma.activityLog.count();

  // Get unique users count
  const uniqueUsers = await prisma.activityLog.findMany({
    distinct: ['userId'],
    select: {
      userId: true,
    },
  });
  const activeUsersCount = uniqueUsers.length;

  const serialized: ActivityLogEntry[] = logs.map((log) => ({
    id: log.id,
    action: log.action,
    description: log.description,
    metadata: (log.metadata as Record<string, unknown> | null) ?? null,
    createdAt: log.createdAt.toISOString(),
    user: log.user ? { id: log.user.id, username: log.user.username, role: log.user.role } : null,
  }));

  const nextCursor = logs.length === PAGE_SIZE ? logs[logs.length - 1].id : null;

  return (
    <LogsClient 
      initialLogs={serialized} 
      initialCursor={nextCursor}
      totalEventsCount={totalCount}
      activeUsersCount={activeUsersCount}
    />
  );
}
