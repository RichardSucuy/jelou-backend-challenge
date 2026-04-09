const { z } = require('zod');

const orderSchema = z.object({
  customer_id: z.number().int().positive(),
  items: z.array(z.object({
    product_id: z.number().int().positive(),
    qty: z.number().int().positive(),
  })).min(1),
});

module.exports = { orderSchema };