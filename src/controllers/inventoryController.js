const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { addStock, setStock } = require('../services/inventoryService');
const { serializeProduct } = require('./productController');

const stockIn = asyncHandler(async (req, res) => {
  const product = await prisma.$transaction((tx) =>
    addStock(
      tx,
      req.validated.params.id,
      req.validated.body.quantity,
      req.user.id,
      req.validated.body.note
    )
  );

  res.json({
    success: true,
    data: serializeProduct(product)
  });
});

const adjustStock = asyncHandler(async (req, res) => {
  const product = await prisma.$transaction((tx) =>
    setStock(
      tx,
      req.validated.params.id,
      req.validated.body.stock,
      req.user.id,
      req.validated.body.note
    )
  );

  res.json({
    success: true,
    data: serializeProduct(product)
  });
});

const inventoryLogs = asyncHandler(async (req, res) => {
  const logs = await prisma.inventoryLog.findMany({
    where: { productId: req.validated.params.id },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  res.json({
    success: true,
    data: logs
  });
});

module.exports = {
  stockIn,
  adjustStock,
  inventoryLogs
};
