import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const addToWishlistSchema = {
  body: z.object({
    productId: z.string().uuid('Invalid product ID')
  })
};

/**
 * @route   GET /api/v1/wishlist
 * @desc    Get user's wishlist
 * @access  Private
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    
    const wishlistItems = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: {
              orderBy: { sortOrder: 'asc' },
              take: 1
            },
            brand: true,
            category: true
          }
        }
      },
      orderBy: { addedAt: 'desc' }
    });

    const wishlist = wishlistItems.map(item => ({
      id: item.id,
      addedAt: item.addedAt,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: item.product.price,
        comparePrice: item.product.comparePrice,
        avgRating: item.product.avgRating,
        reviewCount: item.product.reviewCount,
        status: item.product.status,
        inventoryQuantity: item.product.inventoryQuantity,
        brand: item.product.brand,
        category: item.product.category,
        images: item.product.images
      }
    }));

    res.json({
      success: true,
      data: wishlist,
      count: wishlist.length
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist'
    });
  }
});

/**
 * @route   POST /api/v1/wishlist
 * @desc    Add product to wishlist
 * @access  Private
 */
router.post('/', authenticateToken, validateRequest(addToWishlistSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { productId } = req.body;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if already in wishlist
    const existingItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId,
        productId
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: { sortOrder: 'asc' },
              take: 1
            },
            brand: true,
            category: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      data: {
        id: wishlistItem.id,
        addedAt: wishlistItem.addedAt,
        product: {
          id: wishlistItem.product.id,
          name: wishlistItem.product.name,
          slug: wishlistItem.product.slug,
          price: wishlistItem.product.price,
          comparePrice: wishlistItem.product.comparePrice,
          avgRating: wishlistItem.product.avgRating,
          reviewCount: wishlistItem.product.reviewCount,
          status: wishlistItem.product.status,
          inventoryQuantity: wishlistItem.product.inventoryQuantity,
          brand: wishlistItem.product.brand,
          category: wishlistItem.product.category,
          images: wishlistItem.product.images
        }
      }
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add product to wishlist'
    });
  }
});

/**
 * @route   DELETE /api/v1/wishlist/:productId
 * @desc    Remove product from wishlist
 * @access  Private
 */
router.delete('/:productId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { productId } = req.params;

    // Validate productId
    if (!productId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    // Find and delete wishlist item
    const deletedItem = await prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    res.json({
      success: true,
      message: 'Product removed from wishlist'
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Product not found in wishlist'
      });
    }

    console.error('Error removing from wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove product from wishlist'
    });
  }
});

/**
 * @route   GET /api/v1/wishlist/check/:productId
 * @desc    Check if product is in user's wishlist
 * @access  Private
 */
router.get('/check/:productId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { productId } = req.params;

    // Validate productId
    if (!productId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    res.json({
      success: true,
      data: {
        inWishlist: !!wishlistItem,
        addedAt: wishlistItem?.addedAt || null
      }
    });
  } catch (error) {
    console.error('Error checking wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check wishlist status'
    });
  }
});

/**
 * @route   POST /api/v1/wishlist/toggle
 * @desc    Toggle product in wishlist (add if not present, remove if present)
 * @access  Private
 */
router.post('/toggle', authenticateToken, validateRequest(addToWishlistSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { productId } = req.body;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if already in wishlist
    const existingItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (existingItem) {
      // Remove from wishlist
      await prisma.wishlist.delete({
        where: {
          userId_productId: {
            userId,
            productId
          }
        }
      });

      res.json({
        success: true,
        message: 'Product removed from wishlist',
        data: {
          inWishlist: false,
          action: 'removed'
        }
      });
    } else {
      // Add to wishlist
      const wishlistItem = await prisma.wishlist.create({
        data: {
          userId,
          productId
        }
      });

      res.json({
        success: true,
        message: 'Product added to wishlist',
        data: {
          inWishlist: true,
          action: 'added',
          addedAt: wishlistItem.addedAt
        }
      });
    }
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle wishlist'
    });
  }
});

/**
 * @route   DELETE /api/v1/wishlist
 * @desc    Clear entire wishlist
 * @access  Private
 */
router.delete('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await prisma.wishlist.deleteMany({
      where: { userId }
    });

    res.json({
      success: true,
      message: `Removed ${result.count} items from wishlist`,
      data: {
        removedCount: result.count
      }
    });
  } catch (error) {
    console.error('Error clearing wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear wishlist'
    });
  }
});

export default router;