const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const getDashboard = asyncHandler(async (req, res) => {
  const [
    users,
    products,
    lowStockProducts,
    orders,
    revenue,
    recentOrders
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { stock: { lte: 5 }, isActive: true } }),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { totalAmount: true } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      counts: {
        users,
        products,
        lowStockProducts,
        orders
      },
      revenue: Number(revenue._sum.totalAmount || 0),
      recentOrders: recentOrders.map((order) => ({
        ...order,
        totalAmount: Number(order.totalAmount)
      }))
    }
  });
});

module.exports = {
  getDashboard
};
