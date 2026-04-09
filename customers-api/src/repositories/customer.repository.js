const pool = require('../db/connection');

const insert = async ({ name, email, phone }) => {
  const [row] = await pool.execute(
    'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)',
    [name, email, phone]
  );
  return row.insertId;
};

const findById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return rows[0] ?? null;
};

const findMany = async ({ search, cursor, limit }) => {
  const [rows] = await pool.query(
    `SELECT * FROM customers
     WHERE deleted_at IS NULL
     AND (name LIKE ? OR email LIKE ?)
     AND id > ?
     ORDER BY id ASC
     LIMIT ?`,
    [`%${search}%`, `%${search}%`, Number(cursor), Number(limit)]
  );
  return rows;
};

const updateById = async (id, fields) => {
  const allowed = ['name', 'email', 'phone'];
  const updates = allowed.filter(k => fields[k] !== undefined);
  
  if (!updates.length) throw { status: 400, message: 'No hay campos para actualizar' };

  const sql = `UPDATE customers SET ${updates.map(k => `${k} = ?`).join(', ')} WHERE id = ? AND deleted_at IS NULL`;
  const params = [...updates.map(k => fields[k]), id];

  const [row] = await pool.execute(sql, params);
  return row.affectedRows;
};

const softDeleteById = async (id) => {
  const [row] = await pool.execute(
    'UPDATE customers SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return row.affectedRows;
};

module.exports = { insert, findById, findMany, updateById, softDeleteById };