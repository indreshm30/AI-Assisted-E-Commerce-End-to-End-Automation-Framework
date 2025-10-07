import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateDemoUser() {
  try {
    console.log('Updating demo user password...');

    const passwordHash = '$2b$12$wtV9PtBy0uwC2UMM6UUOguZ5r8GIY9q4u7LHvfLauwdldOQJFgpfK';

    const updatedUser = await prisma.user.update({
      where: { email: 'demo@automatestore.com' },
      data: { passwordHash },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });

    console.log('✅ Demo user password updated successfully!');
    console.log('User:', updatedUser);
    console.log('\n🔑 Login credentials:');
    console.log('Email: demo@automatestore.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('❌ Error updating demo user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateDemoUser().catch(console.error);