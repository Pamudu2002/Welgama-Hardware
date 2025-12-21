import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== 'Owner') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const cursorParam = searchParams.get('cursor');
  const cursor = cursorParam ? Number(cursorParam) : null;

  if (cursorParam && (cursor === null || Number.isNaN(cursor))) {
    return NextResponse.json({ success: false, message: 'Invalid cursor' }, { status: 400 });
  }

  const logs = await prisma.activityLog.findMany({
    take: PAGE_SIZE,
    orderBy: { createdAt: 'desc' },
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
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

  const nextCursor = logs.length === PAGE_SIZE ? logs[logs.length - 1].id : null;

  return NextResponse.json({
    success: true,
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      description: log.description,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
      user: log.user,
    })),
    nextCursor,
  });
}
