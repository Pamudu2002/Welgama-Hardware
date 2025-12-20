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