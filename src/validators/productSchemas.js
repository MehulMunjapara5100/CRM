const { z } = require('zod');
const { idParam, paginationQuery } = require('./commonSchemas');

function coerceBoolean(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

const createProductSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(150),
    description: z.string().trim().min(1),
    price: z.coerce.number().positive(),
    stock: z.coerce.number().int().min(0).default(0),
    isActive: z.preprocess(coerceBoolean, z.boolean().optional()).default(true)
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

const updateProductSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().min(1).optional(),
    price: z.coerce.number().positive().optional(),
    stock: z.coerce.number().int().min(0).optional(),
    isActive: z.preprocess(coerceBoolean, z.boolean().optional())
  }),
  params: idParam,
  query: z.object({}).default({})
});

const listProductsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: paginationQuery.extend({
    search: z.string().trim().optional(),
    isActive: z.preprocess(coerceBoolean, z.boolean().optional())
  })
});

const productIdSchema = z.object({
  body: z.object({}).default({}),
  params: idParam,
  query: z.object({}).default({})
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  listProductsSchema,
  productIdSchema
};
