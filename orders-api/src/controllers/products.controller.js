const repo = require('../repositories/product.repository');
const { productSchema } = require('../schemas/product.schema');

const create = async (req, res) => {
  const result = productSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  try {
    const id = await repo.insert(result.data);
    const product = await repo.findById(id);
    return res.status(201).json(product);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'SKU ya existe' });
    return res.status(500).json({ error: 'Error interno' });
  }
};

const update = async (req, res) => {
  const affected = await repo.updateById(req.params.id, req.body);
  if (!affected) return res.status(404).json({ error: 'Producto no encontrado' });
  const product = await repo.findById(req.params.id);
  return res.json(product);
};

const getById = async (req, res) => {
  const product = await repo.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  return res.json(product);
};

const search = async (req, res) => {
  const { search = '', cursor = 0, limit = 10 } = req.query;
  const rows = await repo.findMany({ search, cursor, limit });
  const nextCursor = rows.length === Number(limit) ? rows[rows.length - 1].id : null;
  return res.json({ data: rows, nextCursor });
};

module.exports = { create, update, getById, search };