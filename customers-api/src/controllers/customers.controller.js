const pool = require('../db/connection');
const { z } = require('zod');

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
});

const create = async (req, res) => {
  const result = customerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const { name, email, phone } = result.data;
  try {
    const [row] = await pool.execute(
      'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)',
      [name, email, phone]
    );
    const [customers] = await pool.execute('SELECT * FROM customers WHERE id = ?', [row.insertId]);
    return res.status(201).json(customers[0]);
  } catch (err) {
    console.error('ERROR CREATE CUSTOMER:', err); // temporal
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email ya registrado' });
    }
    return res.status(500).json({ error: 'Error interno' });
  }
};

const getById = async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
  return res.json(rows[0]);
};

const search = async (req, res) => {
  const { search = '', cursor = 0, limit = 10 } = req.query;
  const [rows] = await pool.execute(
    `SELECT * FROM customers 
     WHERE deleted_at IS NULL 
     AND (name LIKE ? OR email LIKE ?)
     AND id > ?
     ORDER BY id ASC
     LIMIT ?`,
    [`%${search}%`, `%${search}%`, Number(cursor), Number(limit)]
  );
  const nextCursor = rows.length === Number(limit) ? rows[rows.length - 1].id : null;
  return res.json({ data: rows, nextCursor });
};

const update = async (req, res) => {
  const { name, email, phone } = req.body;
  const [row] = await pool.execute(
    'UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ? AND deleted_at IS NULL',
    [name, email, phone, req.params.id]
  );
  if (!row.affectedRows) return res.status(404).json({ error: 'Cliente no encontrado' });
  const [customers] = await pool.execute('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  return res.json(customers[0]);
};

const remove = async (req, res) => {
  const [row] = await pool.execute(
    'UPDATE customers SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (!row.affectedRows) return res.status(404).json({ error: 'Cliente no encontrado' });
  return res.status(204).send();
};

module.exports = { create, getById, search, update, remove };