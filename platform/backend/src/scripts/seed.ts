import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create sample categories
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      isActive: true,
    },
  });

  const smartphones = await prisma.category.upsert({
    where: { slug: 'smartphones' },
    update: {},
    create: {
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'Mobile phones and accessories',
      parentId: electronics.id,
      isActive: true,
    },
  });

  const laptops = await prisma.category.upsert({
    where: { slug: 'laptops' },
    update: {},
    create: {
      name: 'Laptops',
      slug: 'laptops',
      description: 'Laptops and computers',
      parentId: electronics.id,
      isActive: true,
    },
  });

  // Create sample brands
  const appleBrand = await prisma.brand.upsert({
    where: { slug: 'apple' },
    update: {},
    create: {
      name: 'Apple',
      slug: 'apple',
      description: 'Apple Inc. products',
      isActive: true,
    },
  });

  const samsungBrand = await prisma.brand.upsert({
    where: { slug: 'samsung' },
    update: {},
    create: {
      name: 'Samsung',
      slug: 'samsung',
      description: 'Samsung Electronics',
      isActive: true,
    },
  });

  const dellBrand = await prisma.brand.upsert({
    where: { slug: 'dell' },
    update: {},
    create: {
      name: 'Dell',
      slug: 'dell',
      description: 'Dell Technologies',
      isActive: true,
    },
  });

  // Create sample products
  const iphone = await prisma.product.upsert({
    where: { slug: 'iphone-15-pro' },
    update: {},
    create: {
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      description: 'The latest iPhone with advanced Pro camera system, Action button, and titanium design.',
      shortDescription: 'Latest iPhone with Pro features',
      sku: 'IPHONE-15-PRO-128',
      price: 999.99,
      comparePrice: 1099.99,
      categoryId: smartphones.id,
      brandId: appleBrand.id,
      status: 'ACTIVE',
      inventoryQuantity: 50,
      weight: 0.187,
      featured: true,
    },
  });

  const galaxyS24 = await prisma.product.upsert({
    where: { slug: 'samsung-galaxy-s24' },
    update: {},
    create: {
      name: 'Samsung Galaxy S24',
      slug: 'samsung-galaxy-s24',
      description: 'Experience the power of Galaxy AI with advanced photography, enhanced productivity, and seamless connectivity.',
      shortDescription: 'Premium Android smartphone with AI features',
      sku: 'GALAXY-S24-256',
      price: 899.99,
      comparePrice: 949.99,
      categoryId: smartphones.id,
      brandId: samsungBrand.id,
      status: 'ACTIVE',
      inventoryQuantity: 35,
      weight: 0.168,
      featured: true,
    },
  });

  const macbook = await prisma.product.upsert({
    where: { slug: 'macbook-air-m3' },
    update: {},
    create: {
      name: 'MacBook Air M3',
      slug: 'macbook-air-m3',
      description: 'Supercharged by the Apple M3 chip, the 13-inch MacBook Air is a portable powerhouse.',
      shortDescription: 'Ultra-thin laptop with M3 chip',
      sku: 'MACBOOK-AIR-M3-256',
      price: 1299.99,
      comparePrice: 1399.99,
      categoryId: laptops.id,
      brandId: appleBrand.id,
      status: 'ACTIVE',
      inventoryQuantity: 20,
      weight: 1.24,
      featured: true,
    },
  });

  const dellXPS = await prisma.product.upsert({
    where: { slug: 'dell-xps-13' },
    update: {},
    create: {
      name: 'Dell XPS 13',
      slug: 'dell-xps-13',
      description: 'Premium ultrabook with stunning InfinityEdge display and exceptional performance.',
      shortDescription: 'Premium Windows ultrabook',
      sku: 'DELL-XPS-13-512',
      price: 1199.99,
      categoryId: laptops.id,
      brandId: dellBrand.id,
      status: 'ACTIVE',
      inventoryQuantity: 15,
      weight: 1.27,
    },
  });

  // Add product images
  const existingImages = await prisma.productImage.findMany();
  
  if (existingImages.length === 0) {
    await prisma.productImage.createMany({
      data: [
        {
          productId: iphone.id,
          url: 'https://via.placeholder.com/600x600/1e40af/ffffff?text=iPhone+15+Pro',
          altText: 'iPhone 15 Pro - Titanium Blue',
          sortOrder: 0,
        },
        {
          productId: galaxyS24.id,
          url: 'https://via.placeholder.com/600x600/7c3aed/ffffff?text=Galaxy+S24',
          altText: 'Samsung Galaxy S24 - Phantom Black',
          sortOrder: 0,
        },
        {
          productId: macbook.id,
          url: 'https://via.placeholder.com/600x600/6b7280/ffffff?text=MacBook+Air+M3',
          altText: 'MacBook Air M3 - Space Gray',
          sortOrder: 0,
        },
        {
          productId: dellXPS.id,
          url: 'https://via.placeholder.com/600x600/059669/ffffff?text=Dell+XPS+13',
          altText: 'Dell XPS 13 - Platinum Silver',
          sortOrder: 0,
        },
      ]
    });
  }

  // Create a sample coupon
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      name: 'Welcome Discount',
      description: '10% off your first order',
      type: 'PERCENTAGE',
      value: 10,
      minimumOrderAmount: 100,
      usageLimit: 1000,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`📱 Created ${await prisma.product.count()} products`);
  console.log(`📂 Created ${await prisma.category.count()} categories`);
  console.log(`🏷️  Created ${await prisma.brand.count()} brands`);
  console.log(`🖼️  Created ${await prisma.productImage.count()} product images`);
  console.log(`🎟️  Created ${await prisma.coupon.count()} coupons`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });