const { z } = require('zod');

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
});

module.exports = { customerSchema };