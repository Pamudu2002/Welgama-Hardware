import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const totalExpenses = await prisma.expense.aggregate({
      _sum: {
        amount: true,
      },
    });

    return NextResponse.json({
      total: Number(totalExpenses._sum.amount || 0),
    });
  } catch (error) {
    console.error('Error fetching total expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch total expenses' },
      { status: 500 }
    );
  }
}
