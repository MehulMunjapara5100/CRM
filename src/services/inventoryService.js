const ApiError = require('../utils/ApiError');

async function addStock(tx, productId, quantity, userId, note) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) throw new ApiError(404, 'Product not found');

  const updated = await tx.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } }
  });

  await tx.inventoryLog.create({
    data: {
      productId,
      userId,
      type: 'STOCK_IN',
      quantity,
      beforeStock: product.stock,
      afterStock: updated.stock,
      note
    }
  });

  return updated;
}

async function setStock(tx, productId, stock, userId, note) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) throw new ApiError(404, 'Product not found');

  const updated = await tx.product.update({
    where: { id: productId },
    data: { stock }
  });

  await tx.inventoryLog.create({
    data: {
      productId,
      userId,
      type: 'ADJUSTMENT',
      quantity: stock - product.stock,
      beforeStock: product.stock,
      afterStock: updated.stock,
      note
    }
  });

  return updated;
}

async function decrementForOrder(tx, productId, quantity, userId) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) {
    throw new ApiError(404, `Product ${productId} is unavailable`);
  }

  const updateResult = await tx.product.updateMany({
    where: {
      id: productId,
      stock: { gte: quantity }
    },
    data: {
      stock: { decrement: quantity }
    }
  });

  if (updateResult.count !== 1) {
    throw new ApiError(409, `Insufficient stock for ${product.title}`);
  }

  const updated = await tx.product.findUnique({ where: { id: productId } });

  await tx.inventoryLog.create({
    data: {
      productId,
      userId,
      type: 'ORDER_OUT',
      quantity: -quantity,
      beforeStock: product.stock,
      afterStock: updated.stock,
      note: 'Stock decreased by order creation'
    }
  });

  return product;
}

module.exports = {
  addStock,
  setStock,
  decrementForOrder
};
