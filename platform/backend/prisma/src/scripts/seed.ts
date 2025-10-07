import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@automatestore.com' },
    update: {},
    create: {
      email: 'admin@automatestore.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  // Create sample categories
  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      isActive: true,
    },
  });

  const smartphones = await prisma.category.create({
    data: {
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'Mobile phones and accessories',
      parentId: electronics.id,
      isActive: true,
    },
  });

  // Create sample brand
  const sampleBrand = await prisma.brand.create({
    data: {
      name: 'AutomateStore',
      slug: 'automatestore',
      description: 'Our premium brand',
      isActive: true,
    },
  });

  // Create sample products
  const product1 = await prisma.product.create({
    data: {
      name: 'Sample Smartphone',
      slug: 'sample-smartphone',
      description: 'A great smartphone for testing our platform',
      shortDescription: 'Test smartphone',
      sku: 'PHONE-001',
      price: 599.99,
      comparePrice: 699.99,
      categoryId: smartphones.id,
      brandId: sampleBrand.id,
      status: 'ACTIVE',
      inventoryQuantity: 50,
      weight: 0.2,
    },
  });

  await prisma.productImage.create({
    data: {
      productId: product1.id,
      url: 'https://via.placeholder.com/400x400?text=Smartphone',
      altText: 'Sample Smartphone',
      sortOrder: 0,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Test Laptop',
      slug: 'test-laptop',
      description: 'A powerful laptop for development',
      shortDescription: 'Development laptop',
      sku: 'LAPTOP-001',
      price: 1299.99,
      categoryId: electronics.id,
      brandId: sampleBrand.id,
      status: 'ACTIVE',
      inventoryQuantity: 25,
      weight: 2.5,
    },
  });

  await prisma.productImage.create({
    data: {
      productId: product2.id,
      url: 'https://via.placeholder.com/400x400?text=Laptop',
      altText: 'Test Laptop',
      sortOrder: 0,
    },
  });

  // Create a sample coupon
  await prisma.coupon.create({
    data: {
      code: 'WELCOME10',
      name: 'Welcome Discount',
      description: '10% off your first order',
      type: 'PERCENTAGE',
      value: 10,
      minimumOrderAmount: 50,
      usageLimit: 100,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log('Database seeded successfully!');
  console.log(`Admin user created: admin@automatestore.com / admin123`);
  console.log(`Categories: ${electronics.name}, ${smartphones.name}`);
  console.log(`Products: ${product1.name}, ${product2.name}`);
  console.log(`Brand: ${sampleBrand.name}`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });