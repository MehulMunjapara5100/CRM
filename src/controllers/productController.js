const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { uploadImages } = require('../services/imageService');

function serializeProduct(product) {
  return {
    ...product,
    price: Number(product.price)
  };
}

const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive } = req.validated.query;
  const where = {
    isActive: isActive ?? true,
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } }
          ]
        }
      : {})
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { images: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.product.count({ where })
  ]);

  res.json({
    success: true,
    data: products.map(serializeProduct),
    meta: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: req.validated.params.id },
    include: { images: true }
  });

  res.json({
    success: true,
    data: serializeProduct(product)
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const uploadedImages = await uploadImages(req.files || []);
  const product = await prisma.product.create({
    data: {
      ...req.validated.body,
      images: {
        create: uploadedImages
      }
    },
    include: { images: true }
  });

  res.status(201).json({
    success: true,
    data: serializeProduct(product)
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const uploadedImages = await uploadImages(req.files || []);

  if (!uploadedImages.length && !Object.keys(req.validated.body).length) {
    throw new ApiError(400, 'At least one product field or image is required');
  }

  const product = await prisma.product.update({
    where: { id: req.validated.params.id },
    data: {
      ...req.validated.body,
      ...(uploadedImages.length
        ? {
            images: {
              create: uploadedImages
            }
          }
        : {})
    },
    include: { images: true }
  });

  res.json({
    success: true,
    data: serializeProduct(product)
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const updated = await prisma.$executeRaw`
    UPDATE Product
    SET isActive = false, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ${req.validated.params.id}
  `;

  if (!updated) {
    throw new ApiError(404, 'Record not found');
  }

  res.status(204).send();
});

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  serializeProduct
};
