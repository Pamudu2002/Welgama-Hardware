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
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const { skip, limit: validatedLimit } = calculatePagination({ page, limit });

    // Build where clause for search
    const where = {
      paymentStatus: {
        in: ['Credit', 'Pending', 'Partial'],
      },
      ...(search && {
        OR: [
          {
            customer: {
              name: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
          },
          {
            customer: {
              phone: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
          },
        ],
      }),
    };

    // Get total count for pagination
    const totalCount = await prisma.sale.count({ where });

    // Fetch paginated credit sales
    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: {
                name: true,
                unit: true,
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            date: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      skip,
      take: validatedLimit,
    });

    const response = createPaginatedResponse(sales, totalCount, { page, limit: validatedLimit });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Books API error:', error);
    return NextResponse.json({ error: 'Failed to fetch credit sales' }, { status: 500 });
  }
}
