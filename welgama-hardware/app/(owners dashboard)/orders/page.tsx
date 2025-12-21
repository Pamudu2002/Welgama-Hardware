import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import OrdersClient from './OrdersClient';

// Orders management page
export default async function OrdersPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  // Fetch all sales with relations
  const sales = await prisma.sale.findMany({
    include: {
      user: {
        select: {
          username: true,
        },
      },
      customer: {
        select: {
          name: true,
          phone: true,
        },
      },
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
      payments: true,
    },
    orderBy: {
      date: 'desc',
    },
  });

  // Serialize the data for client component
  const serializedSales = sales.map((sale) => ({
    id: sale.id,
    date: sale.date.toISOString(),
    totalAmount: Number(sale.totalAmount),
    paymentStatus: sale.paymentStatus,
    orderStatus: sale.orderStatus,
    amountPaid: Number(sale.amountPaid),
    changeGiven: Number(sale.changeGiven),
    isDelivered: sale.isDelivered,
    cashier: sale.user.username,
    customer: sale.customer ? {
      name: sale.customer.name,
      phone: sale.customer.phone,
    } : null,
    items: sale.items.map((item) => ({
      id: item.id,
      productName: item.product.name,
      quantity: item.quantity,
      unit: item.product.unit,
      price: Number(item.priceSnapshot),
      discount: Number(item.discount),
      discountType: item.discountType,
      subtotal: Number(item.subtotal),
    })),
    payments: sale.payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      date: payment.date.toISOString(),
      note: payment.note,
    })),
  }));

  return <OrdersClient sales={serializedSales} />;
}
