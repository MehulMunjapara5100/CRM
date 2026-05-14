const express = require('express');
const orderController = require('../controllers/orderController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createOrderSchema,
  listOrdersSchema,
  orderIdSchema
} = require('../validators/orderSchemas');

const router = express.Router();

router.use(authenticate);

router
  .route('/')
  .get(authorize('ADMIN', 'STAFF', 'CLIENT'), validate(listOrdersSchema), orderController.listOrders)
  .post(authorize('ADMIN', 'STAFF', 'CLIENT'), validate(createOrderSchema), orderController.createOrder);

router.get(
  '/:id',
  authorize('ADMIN', 'STAFF', 'CLIENT'),
  validate(orderIdSchema),
  orderController.getOrder
);

module.exports = router;
