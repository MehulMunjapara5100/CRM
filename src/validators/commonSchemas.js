const { z } = require('zod');

const idParam = z.object({
  id: z.coerce.number().int().positive()
});

const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

module.exports = {
  idParam,
  paginationQuery
};
