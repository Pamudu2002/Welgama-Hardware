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
    const categoryId = searchParams.get('categoryId');
    const sortBy = searchParams.get('sortBy') || 'last-added';
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';

    const { skip, limit: validatedLimit } = calculatePagination({ page, limit });

    // Build where clause for filters
    const where: any = {};
    
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }
    
    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }

    // Get total count for pagination (before applying low stock filter for accurate count)
    const totalCount = await prisma.product.count({ where });

    // Fetch all products matching search/category filters
    const allProducts = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: sortBy === 'first-added' ? { id: 'asc' } : sortBy === 'alphabetic' ? { name: 'asc' } : { id: 'desc' },
    });

    // Apply low stock filter in-memory (since it requires comparing quantity with lowStockThreshold)
    let filteredProducts = allProducts;
    if (lowStockOnly) {
      filteredProducts = allProducts.filter(p => p.quantity < p.lowStockThreshold);
    }

    // Apply pagination to filtered results
    const paginatedProducts = filteredProducts.slice(skip, skip + validatedLimit);
    const filteredTotalCount = filteredProducts.length;

    // Convert Decimal types to numbers
    const serializedProducts = paginatedProducts.map((product) => ({
      ...product,
      costPrice: Number(product.costPrice),
      sellingPrice: Number(product.sellingPrice),
    }));

    const response = createPaginatedResponse(serializedProducts, filteredTotalCount, { page, limit: validatedLimit });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}
