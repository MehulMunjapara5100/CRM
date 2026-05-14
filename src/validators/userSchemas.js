const { z } = require('zod');
const { idParam, paginationQuery } = require('./commonSchemas');

const roleSchema = z.enum(['ADMIN', 'STAFF', 'CLIENT']);

const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(8).max(128),
    role: roleSchema.default('CLIENT'),
    isActive: z.coerce.boolean().default(true)
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

const updateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().toLowerCase().optional(),
    password: z.string().min(8).max(128).optional(),
    role: roleSchema.optional(),
    isActive: z.coerce.boolean().optional()
  }).refine((data) => Object.keys(data).length > 0, 'At least one field is required'),
  params: idParam,
  query: z.object({}).default({})
});

const listUsersSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: paginationQuery.extend({
    role: roleSchema.optional(),
    search: z.string().trim().optional()
  })
});

const userIdSchema = z.object({
  body: z.object({}).default({}),
  params: idParam,
  query: z.object({}).default({})
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  listUsersSchema,
  userIdSchema
};
