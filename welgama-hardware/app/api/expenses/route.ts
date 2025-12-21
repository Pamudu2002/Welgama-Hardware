import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { calculatePagination, createPaginatedResponse } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const { skip, limit: validatedLimit } = calculatePagination({ page, limit });

    // Build where clause for date filter
    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.expense.count({ where });

    // Fetch paginated expenses
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: validatedLimit,
    });

    const response = createPaginatedResponse(expenses, totalCount, { page, limit: validatedLimit });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Expenses API error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}
