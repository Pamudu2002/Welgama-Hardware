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

  // 3. Create Categories
  const categories = [
    'Hand Tools',
    'Power Tools',
    'Paint & Supplies',
    'Fasteners',
    'Electrical',
    'Plumbing',
    'Building Materials',
    'Garden Tools',
    'Safety Equipment',
    'Hardware'
  ];

  const createdCategories = [];
  for (const catName of categories) {
    const category = await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    });
    createdCategories.push(category);
    console.log(`✅ Category created: ${category.name}`);
  }

  // 4. Create 100 Products
  const units = ['pcs', 'kg', 'box', 'pack', 'l', 'm', 'g', 'cm'];
  
  const productNames = [
    // Hand Tools (10)
    'Screwdriver Set', 'Hammer Claw', 'Pliers Set', 'Wrench Adjustable', 'Tape Measure 5m',
    'Hand Saw', 'Utility Knife', 'Allen Key Set', 'Wire Cutter', 'Level Spirit',
    
    // Power Tools (10)
    'Drill Machine', 'Angle Grinder', 'Circular Saw', 'Jigsaw', 'Impact Driver',
    'Rotary Hammer', 'Belt Sander', 'Orbital Sander', 'Heat Gun', 'Power Screwdriver',
    
    // Paint & Supplies (10)
    'Paint Roller', 'Paint Brush 2"', 'Paint Brush 4"', 'Paint Tray', 'Masking Tape',
    'Sandpaper Assorted', 'Primer White', 'Paint Thinner', 'Putty Knife', 'Drop Cloth',
    
    // Fasteners (10)
    'Wood Screws 1"', 'Wood Screws 2"', 'Metal Screws', 'Nails Assorted', 'Bolts & Nuts Set',
    'Wall Anchors', 'L-Brackets', 'Corner Braces', 'Hinges Door', 'Cabinet Handles',
    
    // Electrical (10)
    'Extension Cord 5m', 'Power Strip 4-Way', 'LED Bulb 9W', 'LED Bulb 12W', 'Electrical Tape',
    'Wire Stripper', 'Cable Ties', 'Switch Socket', 'Junction Box', 'Circuit Breaker',
    
    // Plumbing (10)
    'PVC Pipe 1/2"', 'PVC Pipe 1"', 'Elbow Joint', 'T-Joint', 'Pipe Wrench',
    'Teflon Tape', 'Sink Drain', 'Faucet Kitchen', 'Shower Head', 'Plumbing Glue',
    
    // Building Materials (10)
    'Cement Bag 50kg', 'Sand Fine 25kg', 'Gravel 20kg', 'Concrete Mix', 'Brick Red',
    'Tile Adhesive', 'Grout White', 'Waterproof Sealant', 'Foam Insulation', 'Drywall Sheet',
    
    // Garden Tools (10)
    'Garden Shovel', 'Garden Rake', 'Pruning Shears', 'Garden Hose 15m', 'Watering Can',
    'Lawn Mower Manual', 'Hedge Trimmer', 'Garden Gloves', 'Plant Pot Large', 'Fertilizer Organic',
    
    // Safety Equipment (10)
    'Safety Goggles', 'Work Gloves Leather', 'Dust Mask', 'Hard Hat', 'Ear Plugs',
    'Safety Vest', 'First Aid Kit', 'Fire Extinguisher', 'Knee Pads', 'Safety Harness',
    
    // Hardware (10)
    'Padlock 50mm', 'Door Lock Set', 'Chain Link', 'Rope Nylon 10m', 'Bungee Cord',
    'Carabiner Set', 'Tool Box Plastic', 'Storage Bin', 'Tarp Heavy Duty', 'Zip Lock Bags'
  ];

  let productIndex = 0;
  for (let i = 0; i < 10; i++) { // 10 categories
    for (let j = 0; j < 10; j++) { // 10 products per category
      if (productIndex >= productNames.length) break;
      
      const costPrice = (Math.random() * 50 + 5).toFixed(2); // $5-$55
      const sellingPrice = (parseFloat(costPrice) * (1.2 + Math.random() * 0.5)).toFixed(2); // 20-70% markup
      const quantity = Math.floor(Math.random() * 100) + 10; // 10-110
      const unit = units[Math.floor(Math.random() * units.length)];
      
      await prisma.product.create({
        data: {
          name: productNames[productIndex],
          categoryId: createdCategories[i].id,
          costPrice: parseFloat(costPrice),
          sellingPrice: parseFloat(sellingPrice),
          quantity: quantity,
          unit: unit,
          lowStockThreshold: 5 + Math.floor(Math.random() * 10), // 5-15
        },
      });
      
      productIndex++;
      if ((productIndex) % 10 === 0) {
        console.log(`✅ Created ${productIndex} products...`);
      }
    }
  }

  console.log(`✅ Total ${productIndex} products created!`);
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