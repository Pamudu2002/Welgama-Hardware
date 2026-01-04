'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export async function authenticate(
  prevState: string | undefined, 
  formData: FormData
) {
  try {
    await signIn('credentials', {
      username: formData.get('username'),
      password: formData.get('password'),
      redirect: false,
    });
    return undefined; // Success
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

const CreateUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const formatCurrency = (value: number) =>
  `Rs.${value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const canManageInventory = (role?: string | null) => role === 'Owner' || role === 'Cashier';

type SessionActor = {
  id?: string | number | null;
  name?: string | null;
  username?: string | null;
  role?: string | null;
};

const normalizeUserId = (userId?: string | number | null) => {
  if (userId === null || userId === undefined) {
    return null;
  }

  if (typeof userId === 'string') {
    const parsed = parseInt(userId, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return userId;
};

const getActorName = (user?: SessionActor | null) => {
  if (!user) return 'Unknown User';
  if (user.name && user.name.trim().length > 0) return user.name;
  if (user.username && user.username.trim().length > 0) return user.username;
  if (user.role) return `${user.role} User`;
  return 'Unknown User';
};

async function logActivity({
  userId,
  action,
  description,
  metadata,
}: {
  userId?: string | number | null;
  action: string;
  description: string;
  metadata?: Prisma.JsonValue;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: normalizeUserId(userId),
        action,
        description,
        metadata: metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error('Activity log error:', error);
  }
}

export async function toggleUserStatus(userId: number, currentStatus: boolean) {
  const session = await auth();
  if (session?.user?.role !== 'Owner') {
    return { success: false, message: 'Unauthorized: Only Owners can toggle user status.' };
  }
  const actor = getActorName(session?.user as SessionActor);

  try {
    const newStatus = !currentStatus;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { active: newStatus },
    });

    await logActivity({
      userId: session?.user?.id,
      action: newStatus ? 'staff.activate' : 'staff.deactivate',
      description: `${actor} ${newStatus ? 'activated' : 'deactivated'} user ${user.username}`,
      metadata: {
        affectedUserId: userId,
        username: user.username,
        newStatus,
      },
    });

    revalidatePath('/cashiers');
    return { 
      success: true, 
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully!`,
      newStatus 
    };
  } catch (error) {
    return { success: false, message: 'Failed to update user status.' };
  }
}

export async function createCashier(formData: FormData) {
  // 1. SECURITY CHECK: Only Owners can do this
  const session = await auth();
  if (session?.user?.role !== 'Owner') {
    return { message: 'Unauthorized: Only Owners can add cashiers.' };
  }
  const actor = getActorName(session?.user as SessionActor);

  // 2. Validate Input
  const parsed = CreateUserSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { message: 'Invalid data. Password must be 6+ chars.' };
  }

  const { username, password } = parsed.data;

  try {
    // 3. Hash the Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create the User in DB
    const newCashier = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'Cashier', // Hardcoded because this form is ONLY for cashiers
      },
    });

    await logActivity({
      userId: session?.user?.id,
      action: 'staff.create',
      description: `${actor} created cashier account for ${username}`,
      metadata: {
        cashierId: newCashier.id,
        username,
      },
    });

    // 5. Refresh the page so the new cashier shows up in the list
    revalidatePath('/cashiers');
    return { message: 'Success! Cashier created.' };
  } catch (error) {
    return { message: 'Database Error: Username might already exist.' };
  }
}

// Add a new category
export async function addCategory(name: string) {
  const session = await auth();
  if (session?.user?.role !== 'Owner') {
    return { success: false, message: 'Unauthorized: Only Owners can add categories.' };
  }
  const actor = getActorName(session?.user as SessionActor);

  try {
    const category = await prisma.category.create({
      data: { name },
    });

    await logActivity({
      userId: session?.user?.id,
      action: 'category.create',
      description: `${actor} created category ${category.name}`,
      metadata: {
        categoryId: category.id,
        name: category.name,
      },
    });
    
    revalidatePath('/inventory');
    return { success: true, message: 'Category added successfully!', category };
  } catch (error) {
    return { success: false, message: 'Failed to add category. It might already exist.' };
  }
}

// Add a new unit
export async function addUnit(name: string) {
  const session = await auth();
  if (!canManageInventory(session?.user?.role)) {
    return { success: false, message: 'Unauthorized: Only authorized staff can add units.' };
  }
  const actor = getActorName(session?.user as SessionActor);

  try {
    const unit = await prisma.unit.create({
      data: { name: name.trim() },
    });

    await logActivity({
      userId: session?.user?.id,
      action: 'unit.create',
      description: `${actor} created unit ${unit.name}`,
      metadata: {
        unitId: unit.id,
        name: unit.name,
      },
    });
    
    revalidatePath('/inventory');
    return { success: true, message: 'Unit added successfully!', unit };
  } catch (error) {
    return { success: false, message: 'Failed to add unit. It might already exist.' };
  }
}

// Add a new product
const ProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  costPrice: z.string().min(1, 'Cost price is required'),
  sellingPrice: z.string().min(1, 'Selling price is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  unit: z.string().min(1, 'Unit is required'),
  lowStockThreshold: z.string().min(1, 'Low stock threshold is required'),
});

export async function addProduct(formData: FormData) {
  const session = await auth();
  if (!canManageInventory(session?.user?.role)) {
    return { success: false, message: 'Unauthorized: Only authorized staff can add products.' };
  }
  const actor = getActorName(session?.user as SessionActor);

  const parsed = ProductSchema.safeParse({
    name: formData.get('name'),
    categoryId: formData.get('categoryId'),
    costPrice: formData.get('costPrice'),
    sellingPrice: formData.get('sellingPrice'),
    quantity: formData.get('quantity'),
    unit: formData.get('unit'),
    lowStockThreshold: formData.get('lowStockThreshold'),
  });

  if (!parsed.success) {
    return { success: false, message: 'Invalid data. Please check all fields.' };
  }

  const { name, categoryId, costPrice, sellingPrice, quantity, unit, lowStockThreshold } = parsed.data;

  try {
    const product = await prisma.product.create({
      data: {
        name,
        categoryId: parseInt(categoryId),
        costPrice: parseFloat(costPrice),
        sellingPrice: parseFloat(sellingPrice),
        quantity: parseInt(quantity),
        unit,
        lowStockThreshold: parseInt(lowStockThreshold),
      },
      include: {
        category: true,
      },
    });

    await logActivity({
      userId: session?.user?.id,
      action: 'product.create',
      description: `${actor} added ${product.name} to inventory`,
      metadata: {
        productName: product.name,
        category: product.category.name,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
        quantity: product.quantity,
        unit: product.unit,
      },
    });

    revalidatePath('/inventory');
    return { success: true, message: 'Success! Product added to inventory.', product };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to add product.' };
  }
}

// Update an existing product
const UpdateProductSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
  name: z.string().min(1, 'Product name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  costPrice: z.string().min(1, 'Cost price is required'),
  sellingPrice: z.string().min(1, 'Selling price is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  unit: z.string().min(1, 'Unit is required'),
  lowStockThreshold: z.string().min(1, 'Low stock threshold is required'),
  reason: z.string().optional(),
});

export async function updateProduct(formData: FormData) {
  const session = await auth();
  if (!canManageInventory(session?.user?.role)) {
    return { success: false, message: 'Unauthorized: Only authorized staff can update products.' };
  }
  const actor = getActorName(session?.user as SessionActor);

  const parsed = UpdateProductSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    categoryId: formData.get('categoryId'),
    costPrice: formData.get('costPrice'),
    sellingPrice: formData.get('sellingPrice'),
    quantity: formData.get('quantity'),
    unit: formData.get('unit'),
    lowStockThreshold: formData.get('lowStockThreshold'),
    reason: formData.get('reason'),
  });

  if (!parsed.success) {
    console.error('Validation error:', parsed.error);
    const errorMessages = parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, message: `Invalid data: ${errorMessages}` };
  }

  const { id, name, categoryId, costPrice, sellingPrice, quantity, unit, lowStockThreshold, reason } = parsed.data;

  try {
    // Get the current product to check for quantity change
    const currentProduct = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });

    if (!currentProduct) {
      return { success: false, message: 'Product not found.' };
    }

    const newQuantity = parseInt(quantity);
    const quantityChanged = newQuantity !== currentProduct.quantity;

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        categoryId: parseInt(categoryId),
        costPrice: parseFloat(costPrice),
        sellingPrice: parseFloat(sellingPrice),
        quantity: newQuantity,
        unit,
        lowStockThreshold: parseInt(lowStockThreshold),
      },
      include: {
        category: true,
      },
    });

    // Log inventory change if quantity changed
    if (quantityChanged && reason) {
      const userId = session?.user?.id;
      await prisma.inventoryLog.create({
        data: {
          productId: parseInt(id),
          quantityChange: newQuantity - currentProduct.quantity,
          quantityBefore: currentProduct.quantity,
          quantityAfter: newQuantity,
          reason: reason,
          userId: userId ? (typeof userId === 'string' ? parseInt(userId) : userId) : null,
        },
      });
    }

    await logActivity({
      userId: session?.user?.id,
      action: 'product.update',
      description: `${actor} updated ${updatedProduct.name}`,
      metadata: {
        productName: updatedProduct.name,
        category: updatedProduct.category.name,
        previousQuantity: currentProduct.quantity,
        newQuantity,
        quantityChange: newQuantity - currentProduct.quantity,
        costPrice: Number(updatedProduct.costPrice),
        sellingPrice: Number(updatedProduct.sellingPrice),
        reason: reason || null,
      },
    });

    revalidatePath('/inventory');
    return { success: true, message: 'Product updated successfully!', product: updatedProduct };
  } catch (error) {
    console.error('Update error:', error);
    return { success: false, message: `Database Error: ${error instanceof Error ? error.message : 'Failed to update product.'}` };
  }
}

// Delete a product
export async function deleteProduct(productId: number) {
  const session = await auth();
  if (!canManageInventory(session?.user?.role)) {
    return { success: false, message: 'Unauthorized: Only authorized staff can delete products.' };
  }
  const actor = getActorName(session?.user as SessionActor);

  try {
    const deletedProduct = await prisma.product.delete({
      where: { id: productId },
      include: {
        category: true,
      },
    });

    await logActivity({
      userId: session?.user?.id,
      action: 'product.delete',
      description: `${actor} removed ${deletedProduct.name} from inventory`,
      metadata: {
        productName: deletedProduct.name,
        category: deletedProduct.category.name,
        quantity: deletedProduct.quantity,
        costPrice: Number(deletedProduct.costPrice),
        sellingPrice: Number(deletedProduct.sellingPrice),
      },
    });

    revalidatePath('/inventory');
    return { success: true, message: 'Success! Product deleted.', productId };
  } catch (error) {
    return { success: false, message: 'Database Error: Failed to delete product. It might be linked to sales.' };
  }
}

// Create a new customer
export async function createCustomer(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { success: false, message: 'Unauthorized.' };
  }
  const actor = getActorName(session.user as SessionActor);

  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const address = formData.get('address') as string;

  if (!name?.trim()) {
    return { success: false, message: 'Customer name is required.' };
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
      },
    });

    await logActivity({
      userId: session.user?.id,
      action: 'customer.create',
      description: `${actor} created customer ${customer.name}`,
      metadata: {
        customerName: customer.name,
        phone: customer.phone || '—',
        address: customer.address || '—',
      },
    });

    revalidatePath('/pos');
    return { success: true, message: 'Customer created successfully!', customer };
  } catch (error) {
    return { success: false, message: 'Failed to create customer.' };
  }
}

// Complete a sale (immediate payment)
export async function completeSale(data: { 
  customerId: number | null; 
  items: any[];
  amountPaid?: number;
  isDelivered?: boolean;
}) {
  const session = await auth();
  if (!session) {
    return { success: false, message: 'Unauthorized.' };
  }
  const actor = getActorName(session.user as SessionActor);

  if (!data.items || data.items.length === 0) {
    return { success: false, message: 'Cart is empty.' };
  }

  try {
    const totalAmount = data.items.reduce((sum, item) => sum + item.subtotal, 0);
    const userId = session?.user?.id;
    const amountPaid = data.amountPaid || totalAmount;
    const isDelivered = data.isDelivered !== undefined ? data.isDelivered : true;
    const changeGiven = amountPaid > totalAmount ? amountPaid - totalAmount : 0;
    
    // Determine order status based on delivery
    const orderStatus = isDelivered ? 'completed' : 'pending_delivery';

    // Create sale with items
    const sale = await prisma.sale.create({
      data: {
        userId: userId ? (typeof userId === 'string' ? parseInt(userId) : userId) : 1,
        customerId: data.customerId,
        totalAmount,
        paymentStatus: 'Paid',
        orderStatus,
        amountPaid,
        changeGiven,
        isDelivered,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            priceSnapshot: item.price,
            costPriceSnapshot: item.costPrice,
            discount: item.discount,
            discountType: item.discountType,
            subtotal: item.subtotal,
          })),
        },
      },
    });

    // Update product quantities
    for (const item of data.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    const customer = data.customerId ? await prisma.customer.findUnique({ where: { id: data.customerId }, select: { name: true } }) : null;

    await logActivity({
      userId: session.user?.id,
      action: 'sale.complete',
      description: `${actor} completed sale #${sale.id}${customer ? ` for ${customer.name}` : ''}`,
      metadata: {
        saleId: sale.id,
        customerName: customer?.name || 'Walk-in Customer',
        totalAmount: Number(totalAmount),
        amountPaid: Number(amountPaid),
        changeGiven: Number(changeGiven),
        deliveryStatus: isDelivered ? 'Delivered' : 'Pending Delivery',
        itemCount: data.items.length,
      },
    });

    revalidatePath('/pos');
    revalidatePath('/dashboard');
    revalidatePath('/orders');
    return { success: true, message: `Sale completed! Total: ${formatCurrency(totalAmount)}, Change: ${formatCurrency(changeGiven)}` };
  } catch (error) {
    console.error('Sale error:', error);
    return { success: false, message: 'Failed to complete sale.' };
  }
}

// Add sale to book (credit sale)
export async function addToBook(data: { customerId: number; items: any[]; isDelivered?: boolean }) {
  const session = await auth();
  if (!session) {
    return { success: false, message: 'Unauthorized.' };
  }
  const actor = getActorName(session.user as SessionActor);

  if (!data.customerId) {
    return { success: false, message: 'Customer is required for credit sale.' };
  }

  if (!data.items || data.items.length === 0) {
    return { success: false, message: 'Cart is empty.' };
  }

  try {
    const totalAmount = data.items.reduce((sum, item) => sum + item.subtotal, 0);
    const userId = session?.user?.id;
    const isDelivered = data.isDelivered ?? false;
    const orderStatus = isDelivered ? 'completed' : 'pending_delivery';

    // Create credit sale with pending_payment status
    const sale = await prisma.sale.create({
      data: {
        userId: userId ? (typeof userId === 'string' ? parseInt(userId) : userId) : 1,
        customerId: data.customerId,
        totalAmount,
        paymentStatus: 'Credit',
        orderStatus,
        amountPaid: 0,
        changeGiven: 0,
        isDelivered,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            priceSnapshot: item.price,
            costPriceSnapshot: item.costPrice,
            discount: item.discount,
            discountType: item.discountType,
            subtotal: item.subtotal,
          })),
        },
      },
    });

    // Update customer balance
    await prisma.customer.update({
      where: { id: data.customerId },
      data: {
        balance: {
          increment: totalAmount,
        },
      },
    });

    // Update product quantities
    for (const item of data.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId }, select: { name: true } });

    await logActivity({
      userId: session.user?.id,
      action: 'sale.credit',
      description: `${actor} added credit sale #${sale.id} to books for ${customer?.name || 'Customer'}`,
      metadata: {
        saleId: sale.id,
        customerName: customer?.name || 'Unknown',
        totalAmount: Number(totalAmount),
        itemCount: data.items.length,
        deliveryStatus: isDelivered ? 'Delivered' : 'Pending Delivery',
      },
    });

    revalidatePath('/pos');
    revalidatePath('/books');
    return { success: true, message: `Added to book! Amount: ${formatCurrency(totalAmount)}` };
  } catch (error) {
    console.error('Book error:', error);
    return { success: false, message: 'Failed to add to book.' };
  }
}

export async function makePayment(data: {
  customerId: number;
  saleIds: number[];
  amount: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' };
    }
    const actor = getActorName(session.user as SessionActor);

    const { customerId, saleIds, amount } = data;

    // Get customer and sales
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return { success: false, message: 'Customer not found' };
    }

    const sales = await prisma.sale.findMany({
      where: { id: { in: saleIds } },
      include: { payments: true },
    });

    // Distribute payment across sales
    let remainingAmount = amount;
    const paymentDate = new Date();
    let updatedBalance = 0;

    await prisma.$transaction(async (tx) => {
      for (const sale of sales) {
        if (remainingAmount <= 0) break;

        const paid = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const saleDue = Number(sale.totalAmount) - paid;

        if (saleDue <= 0) continue;

        const paymentForSale = Math.min(remainingAmount, saleDue);
        remainingAmount -= paymentForSale;

        // Create payment record
        await tx.payment.create({
          data: {
            saleId: sale.id,
            customerId: customerId,
            amount: paymentForSale,
            date: paymentDate,
            note: remainingAmount > 0 ? `Overpayment. Balance: ${formatCurrency(remainingAmount)}` : null,
          },
        });

        // Update sale status
        const newPaid = paid + paymentForSale;
        const newPaymentStatus = newPaid >= Number(sale.totalAmount) ? 'Paid' : 'Partial';
        
        await tx.sale.update({
          where: { id: sale.id },
          data: { 
            paymentStatus: newPaymentStatus,
          },
        });
      }

      const appliedAmount = amount - remainingAmount;

      const currentBalanceRecord = await tx.customer.findUnique({
        where: { id: customerId },
        select: { balance: true },
      });
      const currentBalance = Number(currentBalanceRecord?.balance || 0);
      const newBalance = Math.max(currentBalance - appliedAmount, 0);

      await tx.customer.update({
        where: { id: customerId },
        data: {
          balance: newBalance,
        },
      });

      updatedBalance = newBalance;
    });

    const appliedAmount = amount - remainingAmount;
    const overpayment = Math.max(remainingAmount, 0);
    const message = overpayment > 0 
      ? `Payment of ${formatCurrency(appliedAmount)} recorded. Change returned: ${formatCurrency(overpayment)}`
      : `Payment of ${formatCurrency(appliedAmount)} recorded successfully!`;

    await logActivity({
      userId: session.user.id,
      action: 'payment.record',
      description: `${actor} recorded payment of ${formatCurrency(appliedAmount)} for ${customer.name}`,
      metadata: {
        customerName: customer.name,
        amountPaid: Number(appliedAmount),
        changeReturned: Number(overpayment),
        remainingBalance: Number(updatedBalance),
        salesCount: saleIds.length,
      },
    });

    revalidatePath('/books');
    return { success: true, message, appliedAmount, change: overpayment, remainingBalance: updatedBalance };
  } catch (error) {
    console.error('Payment error:', error);
    return { success: false, message: 'Failed to process payment.' };
  }
}

export async function saveDraft(data: {
  customerId: number | null;
  items: any[];
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized' };
    }
    const actor = getActorName(session.user as SessionActor);

    const draft = await prisma.draft.create({
      data: {
        userId: Number(session.user.id),
        customerId: data.customerId,
        items: JSON.stringify(data.items),
      },
    });

    const customer = data.customerId ? await prisma.customer.findUnique({ where: { id: data.customerId }, select: { name: true } }) : null;

    await logActivity({
      userId: session.user.id,
      action: 'draft.create',
      description: `${actor} saved a draft order${customer ? ` for ${customer.name}` : ''}`,
      metadata: {
        draftId: draft.id,
        customerName: customer?.name || 'Walk-in Customer',
        itemCount: data.items.length,
      },
    });

    revalidatePath('/drafts');
    return { success: true, message: 'Draft saved successfully!', draftId: draft.id };
  } catch (error) {
    console.error('Save draft error:', error);
    return { success: false, message: 'Failed to save draft.' };
  }
}

export async function deleteDraft(draftId: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized' };
    }
    const actor = getActorName(session.user as SessionActor);

    const draft = await prisma.draft.delete({
      where: { id: draftId },
    });

    await logActivity({
      userId: session.user.id,
      action: 'draft.delete',
      description: `${actor} deleted draft #${draft.id}`,
      metadata: {
        draftId: draft.id,
      },
    });

    revalidatePath('/drafts');
    return { success: true, message: 'Draft deleted successfully!' };
  } catch (error) {
    console.error('Delete draft error:', error);
    return { success: false, message: 'Failed to delete draft.' };
  }
}

export async function markAsDelivered(saleId: number) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' };
    }
    const actor = getActorName(session.user as SessionActor);

    await prisma.sale.update({
      where: { id: saleId },
      data: {
        isDelivered: true,
        orderStatus: 'completed',
      },
    });

    await logActivity({
      userId: session.user.id,
      action: 'order.delivered',
      description: `${actor} marked sale #${saleId} as delivered`,
      metadata: {
        saleId,
      },
    });

    revalidatePath('/orders');
    return { success: true, message: 'Order marked as delivered!' };
  } catch (error) {
    console.error('Mark delivered error:', error);
    return { success: false, message: 'Failed to mark as delivered.' };
  }
}

export async function addExpense({
  reason,
  amount,
}: {
  reason: string;
  amount: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' };
    }

    const userId = normalizeUserId(session.user.id);
    const actor = getActorName(session.user as SessionActor);

    const expense = await prisma.expense.create({
      data: {
        userId: userId!,
        reason,
        amount,
      },
    });

    await logActivity({
      userId,
      action: 'expense.create',
      description: `${actor} added expense: ${reason}`,
      metadata: {
        expenseId: expense.id,
        reason,
        amount: formatCurrency(Number(expense.amount)),
      },
    });

    revalidatePath('/expenses');
    return {
      success: true,
      message: 'Expense added successfully!',
      expense: {
        id: expense.id,
        reason: expense.reason,
        amount: expense.amount.toString(),
        createdAt: expense.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Add expense error:', error);
    return { success: false, message: 'Failed to add expense.' };
  }
}