import { PrismaClient } from '@prisma/client';
import logger from './logger';

// Create a single instance of Prisma Client
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event', 
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('Query:', e.query);
    logger.debug('Params:', e.params);
    logger.debug('Duration:', `${e.duration}ms`);
  });
}

// Log errors
prisma.$on('error', (e) => {
  logger.error('Database error:', e);
});

// Log info messages
prisma.$on('info', (e) => {
  logger.info('Database info:', e.message);
});

// Log warnings
prisma.$on('warn', (e) => {
  logger.warn('Database warning:', e.message);
});

// Handle graceful disconnection
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };