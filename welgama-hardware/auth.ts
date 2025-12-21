// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod"; // We use Zod to validate the input type

// Define the validation schema for login
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      // 1. The Logic to verify the user
      authorize: async (credentials) => {
        // Validate input data structure
        const parsedCredentials = loginSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { username, password } = parsedCredentials.data;

        // 2. Find user in Database
        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user) return null;

        // Check if user is active
        if (!user.active) {
          return null;
        }

        // 3. Check if password matches the Hash
        const passwordsMatch = await bcrypt.compare(password, user.password);
        if (!passwordsMatch) return null;

        // 4. Return the user (Success!)
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // We cast 'user' to 'any' to bypass the strict type check
        // This allows us to save the ID (number) and Role (string)
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        // We cast session.user to 'any' to allow adding new properties
        (session.user as any).id = token.id as number;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      // Handle callback after authentication
      if (url.startsWith(baseUrl)) {
        const urlObj = new URL(url);
        
        // After successful credentials login, redirect based on role
        if (urlObj.pathname === '/api/auth/callback/credentials') {
          // We need to get the user's role from the session
          // Since we can't use auth() here, we'll return a default and handle it differently
          return `${baseUrl}/api/auth/session`; // Let the client handle redirect
        }
      }
      
      // Allow relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allow callback URLs on the same origin
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login", // Redirect here if not logged in
  },
});
