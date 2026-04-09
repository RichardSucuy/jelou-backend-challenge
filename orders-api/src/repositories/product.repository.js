const pool = require('../db/connection');

const insert = async ({ sku, name, price_cents, stock }) => {
  const [row] = await pool.execute(
    'INSERT INTO products (sku, name, price_cents, stock) VALUES (?, ?, ?, ?)',
    [sku, name, price_cents, stock]
  );
  return row.insertId;
};

const findById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
  return rows[0] ?? null;
};

const findMany = async ({ search, cursor, limit }) => {
  const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const safeCursor = Math.max(parseInt(cursor) || 0, 0);

  const [rows] = await pool.execute(
    `SELECT * FROM products
     WHERE (name LIKE ? OR sku LIKE ?)
     AND id > ${safeCursor}
     ORDER BY id ASC
     LIMIT ${safeLimit}`,
    [`%${search}%`, `%${search}%`]
  );
  return rows;
};

const updateById = async (id, fields) => {
  const allowed = ['price_cents', 'stock'];
  const updates = allowed.filter(k => fields[k] !== undefined);

  if (!updates.length) throw { status: 400, message: 'No hay campos para actualizar' };

  const sql = `UPDATE products SET ${updates.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
  const params = [...updates.map(k => fields[k]), id];

  const [row] = await pool.execute(sql, params);
  return row.affectedRows;
};

module.exports = { insert, findById, findMany, updateById };