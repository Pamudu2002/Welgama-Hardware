import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total count
    const totalCount = await prisma.product.count();

    // Get all products to calculate stats
    const allProducts = await prisma.product.findMany({
      select: {
        costPrice: true,
        sellingPrice: true,
        quantity: true,
        lowStockThreshold: true,
      },
    });

    // Calculate totals
    const totalCostValue = allProducts.reduce(
      (acc, p) => acc + Number(p.costPrice) * Number(p.quantity),
      0
    );

    const totalSellingValue = allProducts.reduce(
      (acc, p) => acc + Number(p.sellingPrice) * Number(p.quantity),
      0
    );

    const lowStockCount = allProducts.filter(
      (p) => Number(p.quantity) < p.lowStockThreshold
    ).length;

    return NextResponse.json({
      totalCount,
      totalCostValue,
      totalSellingValue,
      lowStockCount,
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory stats' },
      { status: 500 }
    );
  }
}
