const pool = require('../db/connection');
const { z } = require('zod');

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  price_cents: z.number().int().positive(),
  stock: z.number().int().min(0),
});

const create = async (req, res) => {
  const result = productSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const { sku, name, price_cents, stock } = result.data;
  try {
    const [row] = await pool.execute(
      'INSERT INTO products (sku, name, price_cents, stock) VALUES (?, ?, ?, ?)',
      [sku, name, price_cents, stock]
    );
    const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [row.insertId]);
    return res.status(201).json(products[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'SKU ya existe' });
    return res.status(500).json({ error: 'Error interno' });
  }
};

const update = async (req, res) => {
  const { price_cents, stock } = req.body;
  const [row] = await pool.execute(
    'UPDATE products SET price_cents = COALESCE(?, price_cents), stock = COALESCE(?, stock) WHERE id = ?',
    [price_cents, stock, req.params.id]
  );
  if (!row.affectedRows) return res.status(404).json({ error: 'Producto no encontrado' });
  const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
  return res.json(products[0]);
};

const getById = async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
  return res.json(rows[0]);
};

const search = async (req, res) => {
  const { search = '', cursor = 0, limit = 10 } = req.query;
  const [rows] = await pool.execute(
    `SELECT * FROM products
     WHERE (name LIKE ? OR sku LIKE ?)
     AND id > ?
     ORDER BY id ASC
     LIMIT ?`,
    [`%${search}%`, `%${search}%`, Number(cursor), Number(limit)]
  );
  const nextCursor = rows.length === Number(limit) ? rows[rows.length - 1].id : null;
  return res.json({ data: rows, nextCursor });
};

module.exports = { create, update, getById, search };