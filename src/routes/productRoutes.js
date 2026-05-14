const express = require('express');
const productController = require('../controllers/productController');
const inventoryController = require('../controllers/inventoryController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createProductSchema,
  updateProductSchema,
  listProductsSchema,
  productIdSchema
} = require('../validators/productSchemas');
const { stockInSchema, adjustStockSchema } = require('../validators/inventorySchemas');

const router = express.Router();

router
  .route('/')
  .get(validate(listProductsSchema), productController.listProducts)
  .post(
    authenticate,
    authorize('ADMIN'),
    upload.array('images', 8),
    validate(createProductSchema),
    productController.createProduct
  );

router
  .route('/:id')
  .get(validate(productIdSchema), productController.getProduct)
  .patch(
    authenticate,
    authorize('ADMIN'),
    upload.array('images', 8),
    validate(updateProductSchema),
    productController.updateProduct
  )
  .delete(
    authenticate,
    authorize('ADMIN'),
    validate(productIdSchema),
    productController.deleteProduct
  );

router.post(
  '/:id/stock-in',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(stockInSchema),
  inventoryController.stockIn
);

router.patch(
  '/:id/stock',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(adjustStockSchema),
  inventoryController.adjustStock
);

router.get(
  '/:id/inventory-logs',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(productIdSchema),
  inventoryController.inventoryLogs
);

module.exports = router;
