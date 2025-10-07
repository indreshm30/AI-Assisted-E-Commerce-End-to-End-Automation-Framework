import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedWishlist() {
  try {
    console.log('🌱 Seeding wishlist data...');

    // Create or get demo user for testing
    let user = await prisma.user.findFirst({
      where: { email: 'demo@automatestore.com' }
    });

    if (!user) {
      console.log('👤 Creating demo user...');
      user = await prisma.user.create({
        data: {
          email: 'demo@automatestore.com',
          passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewJfzCWGxm0z0K7.', // password123
          firstName: 'Demo',
          lastName: 'User',
          role: 'CUSTOMER',
          emailVerified: true
        }
      });
      console.log('✅ Demo user created');
    }

    const products = await prisma.product.findMany({
      take: 3,
      where: { status: 'ACTIVE' }
    });

    if (products.length === 0) {
      console.log('❌ No products found. Please run the main seed script first.');
      return;
    }

    // Clear existing wishlist items for demo user
    await prisma.wishlist.deleteMany({
      where: { userId: user.id }
    });

    // Add products to wishlist
    const wishlistItems = [];
    for (let i = 0; i < Math.min(3, products.length); i++) {
      const item = await prisma.wishlist.create({
        data: {
          userId: user.id,
          productId: products[i].id
        },
        include: {
          product: true
        }
      });
      wishlistItems.push(item);
    }

    console.log(`✅ Created ${wishlistItems.length} wishlist items for demo user`);
    
    wishlistItems.forEach(item => {
      console.log(`   - Added ${item.product.name} to wishlist`);
    });

    console.log('\n🎉 Wishlist seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding wishlist:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if called directly
if (require.main === module) {
  seedWishlist()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedWishlist };