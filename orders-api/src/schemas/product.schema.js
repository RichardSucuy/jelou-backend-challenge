const { z } = require('zod');

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  price_cents: z.number().int().positive(),
  stock: z.number().int().min(0),
});

module.exports = { productSchema };