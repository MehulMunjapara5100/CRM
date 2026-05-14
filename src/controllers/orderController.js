const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { decrementForOrder } = require('../services/inventoryService');

function serializeOrder(order) {
  return {
    ...order,
    totalAmount: Number(order.totalAmount),
    items: order.items?.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal)
    }))
  };
}

function mergeDuplicateItems(items) {
  const merged = new Map();
  items.forEach((item) => {
    merged.set(item.productId, (merged.get(item.productId) || 0) + item.quantity);
  });
  return Array.from(merged, ([productId, quantity]) => ({ productId, quantity }));
}

const createOrder = asyncHandler(async (req, res) => {
  const items = mergeDuplicateItems(req.validated.body.items);

  const order = await prisma.$transaction(async (tx) => {
    const orderItems = [];

    for (const item of items) {
      const product = await decrementForOrder(tx, item.productId, item.quantity, req.user.id);
      const unitPrice = Number(product.price);
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity
      });
    }

    const totalAmount = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);

    if (totalAmount <= 0) {
      throw new ApiError(400, 'Order total must be greater than zero');
    }

    return tx.order.create({
      data: {
        userId: req.user.id,
        totalAmount,
        items: {
          create: orderItems
        }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, title: true }
            }
          }
        }
      }
    });
  });

  res.status(201).json({
    success: true,
    data: serializeOrder(order)
  });
});

const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, status, userId } = req.validated.query;
  const currentUserId = req.user.role === 'CLIENT' ? req.user.id : userId;
  const where = {
    ...(status ? { status } : {}),
    ...(currentUserId ? { userId: currentUserId } : {})
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, title: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.order.count({ where })
  ]);

  res.json({
    success: true,
    data: orders.map(serializeOrder),
    meta: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: req.validated.params.id },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true }
      },
      items: {
        include: {
          product: {
            select: { id: true, title: true }
          }
        }
      }
    }
  });

  if (req.user.role === 'CLIENT' && order.userId !== req.user.id) {
    throw new ApiError(403, 'You do not have permission to view this order');
  }

  res.json({
    success: true,
    data: serializeOrder(order)
  });
});

module.exports = {
  createOrder,
  listOrders,
  getOrder
};
