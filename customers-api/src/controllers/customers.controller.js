const repo = require('../repositories/customer.repository');
const { customerSchema } = require('../schemas/customer.schema');

const create = async (req, res) => {
  const result = customerSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  try {
    const id = await repo.insert(result.data);
    const customer = await repo.findById(id);
    return res.status(201).json(customer);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email ya registrado' });
    return res.status(500).json({ error: 'Error interno' });
  }
};

const getById = async (req, res) => {
  const customer = await repo.findById(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
  return res.json(customer);
};

const search = async (req, res) => {
  const { search = '', cursor = 0, limit = 10 } = req.query;
  const rows = await repo.findMany({ search, cursor, limit });
  const nextCursor = rows.length === Number(limit) ? rows[rows.length - 1].id : null;
  return res.json({ data: rows, nextCursor });
};

const update = async (req, res) => {
  const affected = await repo.updateById(req.params.id, req.body);
  if (!affected) return res.status(404).json({ error: 'Cliente no encontrado' });
  const customer = await repo.findById(req.params.id);
  return res.json(customer);
};

const remove = async (req, res) => {
  const affected = await repo.softDeleteById(req.params.id);
  if (!affected) return res.status(404).json({ error: 'Cliente no encontrado' });
  return res.status(204).send();
};

module.exports = { create, getById, search, update, remove };