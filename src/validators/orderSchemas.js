const { z } = require('zod');
const { idParam, paginationQuery } = require('./commonSchemas');

const createOrderSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      productId: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().positive()
    })).min(1)
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

const listOrdersSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: paginationQuery.extend({
    status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
    userId: z.coerce.number().int().positive().optional()
  })
});

const orderIdSchema = z.object({
  body: z.object({}).default({}),
  params: idParam,
  query: z.object({}).default({})
});

module.exports = {
  createOrderSchema,
  listOrdersSchema,
  orderIdSchema
};
