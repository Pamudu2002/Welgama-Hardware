import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'Owner') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = 20; // Fixed page size for cursor-based pagination

  // Build where clause for cursor-based pagination
  const where: any = {};
  if (cursor) {
    where.id = {
      lt: parseInt(cursor), // Get logs with ID less than cursor (older logs)
    };
  }

  // Fetch logs
  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
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

  // Calculate next cursor
  const nextCursor = logs.length === limit ? logs[logs.length - 1].id : null;

  const serialized = logs.map((log: any) => ({
    id: log.id,
    action: log.action,
    description: log.description,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
    user: log.user,
  }));

  return NextResponse.json({
    success: true,
    logs: serialized,
    nextCursor,
  });
}
