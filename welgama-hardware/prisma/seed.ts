// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seeding...')

  // Create the Hashed Password
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Insert the Admin User
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {}, // If admin exists, do nothing
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'Owner'
    },
  })

  console.log(`✅ Admin user created: ${user.username} (Role: ${user.role})`)
  console.log('🎉 Seeding completed!')
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