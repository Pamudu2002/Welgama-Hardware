// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seeding...')

  // 1. Create the Hashed Password
  // We cannot store 'admin123'. We must store the encrypted version.
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // 2. Insert the Admin User
  // 'upsert' means: "Update if exists, Create if it doesn't"
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {}, // If admin exists, do nothing
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'Owner' // This is crucial for your RBAC logic
    },
  })

  console.log(`✅ User created: ${user.username} (Role: ${user.role})`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })