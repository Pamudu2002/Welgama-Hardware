# Neon Database Setup Guide

This guide will help you set up your Welgama Hardware application with a Neon PostgreSQL database.

## Step 1: Create a Neon Account and Database

1. Go to [Neon.tech](https://neon.tech/) and sign up for a free account
2. Click **"Create a project"**
3. Choose a project name (e.g., "welgama-hardware")
4. Select a region closest to you
5. Click **"Create project"**

## Step 2: Get Your Database Connection String

1. In your Neon dashboard, you'll see a **Connection Details** section
2. Make sure **"Pooled connection"** is selected (better for serverless)
3. Copy the connection string - it should look like:
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

## Step 3: Configure Your Local Environment

1. Create a `.env` file in the root of your project:
   ```bash
   copy .env.example .env
   ```

2. Open the `.env` file and update the `DATABASE_URL`:
   ```env
   DATABASE_URL="your-neon-connection-string-here"
   ```

3. Generate a NextAuth secret:
   ```bash
   # On Windows PowerShell:
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
   ```
   
   Copy the output and add it to `.env`:
   ```env
   NEXTAUTH_SECRET="your-generated-secret-here"
   ```

## Step 4: Install Dependencies

```bash
pnpm install
```

This will install the new `tsx` package needed for running the seed script.

## Step 5: Set Up the Database

Run the complete database setup with one command:

```bash
pnpm db:setup
```

This command will:
1. Generate Prisma Client
2. Push the schema to your Neon database
3. Run the seed script to create the admin user

### Alternative: Run Steps Individually

If you prefer to run each step separately:

```bash
# Generate Prisma Client
pnpm db:generate

# Push schema to database
pnpm db:push

# Seed the database
pnpm db:seed
```

## Step 6: Verify the Setup

1. Open Prisma Studio to view your database:
   ```bash
   pnpm db:studio
   ```

2. You should see:
   - All tables created (User, Category, Product, Customer, Sale, etc.)
   - One user: `admin` with role `Owner`

3. Default admin credentials:
   - **Username:** `admin`
   - **Password:** `admin123`

## Step 7: Run Your Application

```bash
pnpm dev
```

Visit `http://localhost:3000/login` and log in with the admin credentials.

## Available Database Scripts

- `pnpm db:generate` - Generate Prisma Client
- `pnpm db:push` - Push schema changes to database (for development)
- `pnpm db:migrate` - Run migrations (for production)
- `pnpm db:seed` - Seed the database with initial data
- `pnpm db:studio` - Open Prisma Studio (database GUI)
- `pnpm db:setup` - Complete setup (generate + push + seed)

## Troubleshooting

### Connection Issues

If you get connection errors:
1. Make sure your `.env` file has the correct `DATABASE_URL`
2. Verify the connection string includes `?sslmode=require`
3. Check your Neon project is active (not suspended)

### Seed Script Fails

If the seed script fails:
1. Make sure you ran `pnpm db:push` first to create tables
2. Check if the admin user already exists (seed will update, not fail)
3. Run `pnpm db:studio` to inspect the database

### Migration vs Push

- **Development:** Use `pnpm db:push` for quick schema iterations
- **Production:** Use migrations (`pnpm db:migrate`) for tracked schema changes

## Security Notes

⚠️ **Important:**
- Never commit your `.env` file to Git
- Change the default admin password after first login
- Use strong passwords in production
- Keep your `NEXTAUTH_SECRET` secure

## Next Steps

After setup:
1. Log in with the admin account
2. Change the admin password
3. Create cashier accounts from the Cashiers page
4. Start managing your inventory!

## Neon Free Tier Limits

The free tier includes:
- 512 MB storage
- 3 GB data transfer/month
- Unlimited compute hours
- Auto-suspend after 5 minutes of inactivity

This is perfect for development and small production apps!

---

For more information:
- [Neon Documentation](https://neon.tech/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth Documentation](https://next-auth.js.org/)
