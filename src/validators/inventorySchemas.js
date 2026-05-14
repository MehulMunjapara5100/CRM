const { z } = require('zod');
const { idParam } = require('./commonSchemas');

const stockInSchema = z.object({
  body: z.object({
    quantity: z.coerce.number().int().positive(),
    note: z.string().trim().max(255).optional()
  }),
  params: idParam,
  query: z.object({}).default({})
});

const adjustStockSchema = z.object({
  body: z.object({
    stock: z.coerce.number().int().min(0),
    note: z.string().trim().max(255).optional()
  }),
  params: idParam,
  query: z.object({}).default({})
});

module.exports = {
  stockInSchema,
  adjustStockSchema
};
