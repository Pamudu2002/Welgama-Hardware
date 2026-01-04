import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }

    const selectedDate = new Date(dateParam);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch sales for the selected date
    const sales = await prisma.sale.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        items: true,
      },
    });

    // Fetch expenses for the selected date
    const expenses = await prisma.expense.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Calculate stats
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    
    // Calculate total cost of goods sold
    const totalCost = sales.reduce((sum, sale) => {
      const saleCost = sale.items.reduce((itemSum, item) => {
        return itemSum + (Number(item.costPriceSnapshot) * Number(item.quantity));
      }, 0);
      return sum + saleCost;
    }, 0);

    const totalProfit = totalRevenue - totalCost;
    
    // Count credit sales (pending payments)
    const creditSalesCount = sales.filter(sale => 
      sale.paymentStatus === 'Pending' || sale.paymentStatus === 'Credit'
    ).length;

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        totalSales: sales.length,
        totalProfit,
        totalExpenses,
        salesCount: sales.length,
        creditSalesCount,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
