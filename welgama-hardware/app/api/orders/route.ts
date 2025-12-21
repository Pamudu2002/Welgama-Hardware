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
    const status = searchParams.get('status'); // 'pending_delivery', 'completed', etc.
    const paymentStatus = searchParams.get('paymentStatus'); // 'Paid', 'Credit', etc.
    const search = searchParams.get('search'); // Customer name search
    const startDate = searchParams.get('startDate'); // Date range start
    const endDate = searchParams.get('endDate'); // Date range end
    const isDelivered = searchParams.get('isDelivered'); // 'true' or 'false'

    const { skip, limit: validatedLimit } = calculatePagination({ page, limit });

    // Build where clause for filters
    const where: any = {};
    if (status) {
      where.orderStatus = status;
    }
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }
    if (search) {
      where.customer = {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }
    if (isDelivered !== null && isDelivered !== undefined) {
      where.isDelivered = isDelivered === 'true';
    }

    // Get total count for pagination
    const totalCount = await prisma.sale.count({ where });

    // Fetch paginated sales
    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
        payments: {
          orderBy: {
            date: 'asc',
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      skip,
      take: validatedLimit,
    });

    // Transform sales data to match client expectations
    const transformedSales = sales.map((sale: any) => ({
      id: sale.id,
      date: sale.date.toISOString(),
      totalAmount: Number(sale.totalAmount),
      paymentStatus: sale.paymentStatus,
      orderStatus: sale.orderStatus,
      amountPaid: Number(sale.amountPaid),
      changeGiven: Number(sale.changeGiven),
      isDelivered: sale.isDelivered,
      cashier: sale.user?.username || 'Unknown',
      customer: sale.customer ? {
        name: sale.customer.name,
        phone: sale.customer.phone,
      } : null,
      items: sale.items.map((item: any) => ({
        id: item.id,
        productName: item.product?.name || 'Unknown Product',
        quantity: item.quantity,
        unit: item.product?.unit || 'pcs',
        price: Number(item.price),
        discount: Number(item.discount),
        discountType: item.discountType,
        subtotal: Number(item.subtotal),
      })),
      payments: sale.payments.map((payment: any) => ({
        id: payment.id,
        amount: Number(payment.amount),
        date: payment.date.toISOString(),
        note: payment.note,
      })),
    }));

    const response = createPaginatedResponse(transformedSales, totalCount, { page, limit: validatedLimit });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
