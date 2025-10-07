import { Router } from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import logger from '../utils/logger';

const router = Router();

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  comparePrice: z.number().positive().optional(),
  costPrice: z.number().positive().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  inventoryQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  weight: z.number().positive().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  featured: z.boolean().optional(),
  requiresShipping: z.boolean().optional(),
  isDigital: z.boolean().optional(),
});

const updateProductSchema = createProductSchema.partial();

// Helper function to generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// GET /api/v1/products - List products with filtering, sorting, and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '12',
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      status = 'ACTIVE',
      featured,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter conditions
    const where: any = {
      status: status as string,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
        { sku: { contains: search as string } },
      ];
    }

    if (category) {
      where.categoryId = category as string;
    }

    if (brand) {
      where.brandId = brand as string;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    if (featured) {
      where.featured = featured === 'true';
    }

    // Build sort conditions
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder as string;

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          brand: {
            select: { id: true, name: true, slug: true },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalCount,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch products' },
    });
  }
});

// GET /api/v1/products/search - Advanced product search
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, category, brand, minPrice, maxPrice, limit = '10' } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: { message: 'Search query parameter "q" is required' },
      });
    }

    const limitNum = parseInt(limit as string, 10);
    const searchTerm = q as string;

    const where: any = {
      status: 'ACTIVE',
      OR: [
        { name: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { shortDescription: { contains: searchTerm } },
        { sku: { contains: searchTerm } },
      ],
    };

    if (category) where.categoryId = category as string;
    if (brand) where.brandId = brand as string;

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      orderBy: { name: 'asc' },
      take: limitNum,
    });

    res.json({
      success: true,
      data: { products, query: searchTerm },
    });
  } catch (error) {
    logger.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Search failed' },
    });
  }
});

// GET /api/v1/products/featured - Get featured products
router.get('/featured', async (req: Request, res: Response) => {
  try {
    const { limit = '8' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        featured: true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
    });

    res.json({
      success: true,
      data: { products },
    });
  } catch (error) {
    logger.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch featured products' },
    });
  }
});

// GET /api/v1/products/:id - Get single product by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        brand: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          orderBy: { createdAt: 'asc' },
        },
        reviews: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' },
      });
    }

    // Calculate average rating
    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0;

    res.json({
      success: true,
      data: {
        ...product,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: product.reviews.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch product' },
    });
  }
});

// POST /api/v1/products - Create new product (Admin only)
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = createProductSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validation.error.format(),
        },
      });
    }

    const data = validation.data;

    // Generate slug if not provided
    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }

    // Check for duplicate SKU
    const existingProduct = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        error: { message: 'Product with this SKU already exists' },
      });
    }

    const product = await prisma.product.create({
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: { product },
      message: 'Product created successfully',
    });
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create product' },
    });
  }
});

// PUT /api/v1/products/:id - Update product (Admin only)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateProductSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validation.error.format(),
        },
      });
    }

    const data = validation.data;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' },
      });
    }

    // Check for duplicate SKU (if SKU is being updated)
    if (data.sku && data.sku !== existingProduct.sku) {
      const duplicateSku = await prisma.product.findUnique({
        where: { sku: data.sku },
      });

      if (duplicateSku) {
        return res.status(409).json({
          success: false,
          error: { message: 'Product with this SKU already exists' },
        });
      }
    }

    // Update slug if name is being updated but slug is not provided
    if (data.name && !data.slug) {
      data.slug = generateSlug(data.name);
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
    });

    res.json({
      success: true,
      data: { product },
      message: 'Product updated successfully',
    });
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update product' },
    });
  }
});

// DELETE /api/v1/products/:id - Delete product (Admin only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' },
      });
    }

    // Soft delete by setting status to ARCHIVED
    await prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete product' },
    });
  }
});

export default router;