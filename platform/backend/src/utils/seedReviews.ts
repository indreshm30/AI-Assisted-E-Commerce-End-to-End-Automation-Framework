import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function seedReviews() {
  try {
    console.log('🌱 Seeding reviews...');

    // Get existing products to review
    const products = await prisma.product.findMany({
      take: 4,
    });

    if (products.length === 0) {
      console.log('❌ No products found. Please seed products first.');
      return;
    }

    // Create a demo user for reviews (if not exists)
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {},
      create: {
        email: 'demo@example.com',
        passwordHash: 'demo-hash', // In production, this would be properly hashed
        firstName: 'Demo',
        lastName: 'User',
        role: 'CUSTOMER',
        emailVerified: true,
      },
    });

    console.log(`👤 Demo user: ${demoUser.email}`);

    // Sample reviews data
    const reviewsData = [
      {
        productId: products[0].id,
        userId: demoUser.id,
        rating: 5,
        title: 'Excellent laptop!',
        content: 'This laptop exceeded my expectations. Great performance, beautiful display, and excellent build quality. Highly recommended for both work and entertainment.',
        verifiedPurchase: true,
        status: 'approved',
      },
      {
        productId: products[0].id,
        userId: demoUser.id,
        rating: 4,
        title: 'Very good, with minor issues',
        content: 'Overall a great laptop. The performance is excellent and the screen is beautiful. However, the battery life could be better, and it gets a bit warm during intensive tasks.',
        verifiedPurchase: true,
        status: 'approved',
      },
      {
        productId: products[1].id,
        userId: demoUser.id,
        rating: 5,
        title: 'Perfect for gaming and work',
        content: 'This machine handles everything I throw at it. Gaming at high settings, video editing, development work - all smooth as butter. The RGB lighting is a nice touch too.',
        verifiedPurchase: false,
        status: 'approved',
      },
      {
        productId: products[1].id,
        userId: demoUser.id,
        rating: 3,
        title: 'Good performance but loud fans',
        content: 'The performance is definitely there, but the cooling system is quite noisy under load. Also quite heavy for daily transport. Good value for the specs though.',
        verifiedPurchase: true,
        status: 'approved',
      },
      {
        productId: products[2].id,
        userId: demoUser.id,
        rating: 5,
        title: 'Love this smartphone!',
        content: 'Amazing camera quality, fast performance, and great battery life. The display is gorgeous and the build quality feels premium. Best phone I\'ve owned.',
        verifiedPurchase: true,
        status: 'approved',
      },
      {
        productId: products[2].id,
        userId: demoUser.id,
        rating: 4,
        title: 'Great phone, some minor complaints',
        content: 'Really solid phone overall. Camera is excellent, performance is snappy. Only complaints are that it can get slippery and the price is quite high.',
        verifiedPurchase: true,
        status: 'approved',
      },
      {
        productId: products[3].id,
        userId: demoUser.id,
        rating: 4,
        title: 'Comfortable and stylish',
        content: 'These headphones are very comfortable for long listening sessions. Sound quality is good, not audiophile level but definitely above average. Great for daily use.',
        verifiedPurchase: false,
        status: 'approved',
      },
    ];

    // Create reviews
    for (const reviewData of reviewsData) {
      const review = await prisma.productReview.create({
        data: reviewData,
      });
      console.log(`📝 Created review: ${review.title} (${review.rating}⭐)`);
    }

    // Update product ratings
    for (const product of products) {
      const productReviews = await prisma.productReview.findMany({
        where: { productId: product.id, status: 'approved' },
      });

      if (productReviews.length > 0) {
        const avgRating = productReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / productReviews.length;
        
        await prisma.product.update({
          where: { id: product.id },
          data: {
            avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
            reviewCount: productReviews.length,
          },
        });
        
        console.log(`⭐ Updated ${product.name}: ${avgRating.toFixed(1)} stars (${productReviews.length} reviews)`);
      }
    }

    console.log('✅ Reviews seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding reviews:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedReviews();
}

export { seedReviews };