'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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

export async function createCashier(formData: FormData) {
  // 1. SECURITY CHECK: Only Owners can do this
  const session = await auth();
  if (session?.user?.role !== 'Owner') {
    return { message: 'Unauthorized: Only Owners can add cashiers.' };
  }

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
    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'Cashier', // Hardcoded because this form is ONLY for cashiers
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

  try {
    const category = await prisma.category.create({
      data: { name },
    });
    
    revalidatePath('/inventory');
    return { success: true, message: 'Category added successfully!', category };
  } catch (error) {
    return { success: false, message: 'Failed to add category. It might already exist.' };
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

  try {
    await prisma.product.delete({
      where: { id: productId },
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

    const draft = await prisma.draft.create({
      data: {
        userId: parseInt(session.user.id),
        customerId: data.customerId,
        items: JSON.stringify(data.items),
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

    await prisma.draft.delete({
      where: { id: draftId },
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

    await prisma.sale.update({
      where: { id: saleId },
      data: {
        isDelivered: true,
        orderStatus: 'completed',
      },
    });

    revalidatePath('/orders');
    return { success: true, message: 'Order marked as delivered!' };
  } catch (error) {
    console.error('Mark delivered error:', error);
    return { success: false, message: 'Failed to mark as delivered.' };
  }
}