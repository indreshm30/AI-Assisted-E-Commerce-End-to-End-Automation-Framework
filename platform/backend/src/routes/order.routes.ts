import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation.middleware';
import logger from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createOrderSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number().min(1),
      price: z.number().positive(),
    })),
    shippingAddress: z.object({
      firstName: z.string(),
      lastName: z.string(),
      company: z.string().optional(),
      address: z.string(),
      apartment: z.string().optional(),
      city: z.string(),
      country: z.string(),
      province: z.string(),
      postalCode: z.string(),
      phone: z.string().optional(),
    }),
    billingAddress: z.object({
      firstName: z.string(),
      lastName: z.string(),
      company: z.string().optional(),
      address: z.string(),
      apartment: z.string().optional(),
      city: z.string(),
      country: z.string(),
      province: z.string(),
      postalCode: z.string(),
      phone: z.string().optional(),
    }).optional(),
    paymentMethod: z.string(),
    notes: z.string().optional(),
  }),
});

// GET /orders - Get user's orders
router.get('/', async (req, res): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  images: true,
                  brand: true,
                  category: true,
                },
              },
            },
          },
          payments: true,
        },
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    logger.info('Orders retrieved successfully', {
      page,
      limit,
      totalCount,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error('Error retrieving orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders',
    });
  }
});

// GET /orders/:id - Get specific order
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: true,
                brand: true,
                category: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    logger.info('Order retrieved successfully', {
      orderId: id,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Error retrieving order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order',
    });
  }
});

// POST /orders - Create new order
router.post('/', validateRequest(createOrderSchema), async (req, res) => {
  try {
    const { items, shippingAddress, billingAddress, paymentMethod, notes } = req.body;

    // Calculate order totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal > 50 ? 0 : 9.99;
    const total = subtotal + tax + shipping;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create order with transaction
    const order = await prisma.$transaction(async (tx: any) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          status: 'PENDING',
          subtotal,
          tax,
          shipping,
          total,
          currency: 'USD',
          shippingAddress: JSON.stringify(shippingAddress),
          billingAddress: JSON.stringify(billingAddress || shippingAddress),
          notes,
        },
      });

      // Create order items
      for (const item of items) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          },
        });

        // Update inventory
        await tx.product.update({
          where: { id: item.productId },
          data: {
            inventoryQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Create initial payment record
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount: total,
          currency: 'USD',
          method: paymentMethod,
          status: 'PENDING',
        },
      });

      return newOrder;
    });

    logger.info('Order created successfully', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total,
      itemCount: items.length,
      timestamp: new Date().toISOString(),
    });

    // Get complete order data
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: true,
                brand: true,
                category: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    res.status(201).json({
      success: true,
      data: completeOrder,
      message: 'Order created successfully',
    });
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
    });
  }
});

// PUT /orders/:id/cancel - Cancel order
router.put('/:id/cancel', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existingOrder = await prisma.order.findFirst({
      where: {
        id,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        orderItems: true,
      },
    });

    if (!existingOrder) {
      res.status(404).json({
        success: false,
        message: 'Order not found or cannot be cancelled',
      });
      return;
    }

    // Update order and restore inventory
    await prisma.$transaction(async (tx: any) => {
      // Update order status
      await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: reason || 'Cancelled by customer',
        },
      });

      // Restore inventory
      for (const item of existingOrder.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            inventoryQuantity: {
              increment: item.quantity,
            },
          },
        });
      }
    });

    logger.info('Order cancelled successfully', {
      orderId: id,
      reason,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
    });
  }
});

export default router;