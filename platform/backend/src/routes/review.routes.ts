import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation.middleware';
import { optionalAuth } from '../middleware/auth.middleware';
import logger from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createReviewSchema = {
  body: z.object({
    productId: z.string(),
    rating: z.number().min(1).max(5),
    title: z.string().max(200).optional(),
    content: z.string().max(2000).optional(),
    orderItemId: z.string().optional(),
  }),
};

const updateReviewSchema = {
  body: z.object({
    rating: z.number().min(1).max(5).optional(),
    title: z.string().max(200).optional(),
    content: z.string().max(2000).optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
};

// GET /reviews - Get reviews for a product or user
router.get('/', optionalAuth, async (req, res): Promise<void> => {
  try {
    const { productId, userId, status = 'approved', page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};
    
    if (productId) {
      whereClause.productId = productId as string;
    }
    
    if (userId) {
      whereClause.userId = userId as string;
    }
    
    if (status) {
      whereClause.status = status as string;
    }

    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder as 'asc' | 'desc';

    const [reviews, totalCount, avgRating] = await Promise.all([
      prisma.productReview.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          orderItem: {
            select: {
              id: true,
              orderId: true,
            },
          },
        },
      }),
      prisma.productReview.count({ where: whereClause }),
      productId ? prisma.productReview.aggregate({
        where: { productId: productId as string, status: 'approved' },
        _avg: { rating: true },
        _count: { rating: true },
      }) : null,
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    const result: any = {
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };

    if (avgRating) {
      result.avgRating = avgRating._avg.rating || 0;
      result.totalReviews = avgRating._count.rating || 0;
    }

    logger.info('Reviews retrieved successfully', {
      productId,
      userId,
      totalCount,
      avgRating: result.avgRating,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error retrieving reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve reviews',
    });
  }
});

// GET /reviews/:id - Get specific review
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const review = await prisma.productReview.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        orderItem: {
          select: {
            id: true,
            orderId: true,
          },
        },
      },
    });

    if (!review) {
      res.status(404).json({
        success: false,
        message: 'Review not found',
      });
      return;
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    logger.error('Error retrieving review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve review',
    });
  }
});

// POST /reviews - Create new review (requires auth)
router.post('/', validateRequest(createReviewSchema), async (req, res): Promise<void> => {
  try {
    const { productId, rating, title, content, orderItemId } = req.body;
    
    // For now, create review without user authentication (demo purposes)
    // In production, you would get userId from authenticated user
    const userId = 'demo-user-id'; // This would come from req.user.id in real implementation

    // Check if user has already reviewed this product
    const existingReview = await prisma.productReview.findFirst({
      where: {
        productId,
        userId,
      },
    });

    if (existingReview) {
      res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
      return;
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    // Check if this is a verified purchase
    let verifiedPurchase = false;
    if (orderItemId) {
      const orderItem = await prisma.orderItem.findFirst({
        where: {
          id: orderItemId,
          productId,
          order: {
            status: { in: ['DELIVERED', 'COMPLETED'] },
          },
        },
        include: {
          order: true,
        },
      });
      verifiedPurchase = !!orderItem;
    }

    const review = await prisma.productReview.create({
      data: {
        productId,
        userId,
        orderItemId,
        rating,
        title,
        content,
        verifiedPurchase,
        status: 'approved', // Auto-approve for demo, in production you might want moderation
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Update product average rating
    const productStats = await prisma.productReview.aggregate({
      where: { productId, status: 'approved' },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: productStats._avg.rating || 0,
        reviewCount: productStats._count.rating || 0,
      },
    });

    logger.info('Review created successfully', {
      reviewId: review.id,
      productId,
      rating,
      verifiedPurchase,
    });

    res.status(201).json({
      success: true,
      data: review,
      message: 'Review created successfully',
    });
  } catch (error) {
    logger.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create review',
    });
  }
});

// PUT /reviews/:id - Update review (requires auth and ownership)
router.put('/:id', validateRequest(updateReviewSchema), async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, title, content } = req.body;
    
    // For demo purposes, skip auth check
    // In production: verify user owns this review

    const existingReview = await prisma.productReview.findUnique({
      where: { id },
    });

    if (!existingReview) {
      res.status(404).json({
        success: false,
        message: 'Review not found',
      });
      return;
    }

    const updatedReview = await prisma.productReview.update({
      where: { id },
      data: {
        ...(rating !== undefined && { rating }),
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Update product average rating if rating changed
    if (rating !== undefined) {
      const productStats = await prisma.productReview.aggregate({
        where: { productId: existingReview.productId, status: 'approved' },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await prisma.product.update({
        where: { id: existingReview.productId },
        data: {
          avgRating: productStats._avg.rating || 0,
          reviewCount: productStats._count.rating || 0,
        },
      });
    }

    logger.info('Review updated successfully', {
      reviewId: id,
      productId: existingReview.productId,
    });

    res.json({
      success: true,
      data: updatedReview,
      message: 'Review updated successfully',
    });
  } catch (error) {
    logger.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review',
    });
  }
});

// DELETE /reviews/:id - Delete review (requires auth and ownership)
router.delete('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    
    // For demo purposes, skip auth check
    // In production: verify user owns this review or is admin

    const existingReview = await prisma.productReview.findUnique({
      where: { id },
    });

    if (!existingReview) {
      res.status(404).json({
        success: false,
        message: 'Review not found',
      });
      return;
    }

    await prisma.productReview.delete({
      where: { id },
    });

    // Update product average rating
    const productStats = await prisma.productReview.aggregate({
      where: { productId: existingReview.productId, status: 'approved' },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id: existingReview.productId },
      data: {
        avgRating: productStats._avg.rating || 0,
        reviewCount: productStats._count.rating || 0,
      },
    });

    logger.info('Review deleted successfully', {
      reviewId: id,
      productId: existingReview.productId,
    });

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
    });
  }
});

// POST /reviews/:id/helpful - Mark review as helpful
router.post('/:id/helpful', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const review = await prisma.productReview.findUnique({
      where: { id },
    });

    if (!review) {
      res.status(404).json({
        success: false,
        message: 'Review not found',
      });
      return;
    }

    const updatedReview = await prisma.productReview.update({
      where: { id },
      data: {
        helpfulCount: {
          increment: 1,
        },
      },
    });

    res.json({
      success: true,
      data: {
        reviewId: id,
        helpfulCount: updatedReview.helpfulCount,
      },
      message: 'Review marked as helpful',
    });
  } catch (error) {
    logger.error('Error marking review as helpful:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark review as helpful',
    });
  }
});

export default router;