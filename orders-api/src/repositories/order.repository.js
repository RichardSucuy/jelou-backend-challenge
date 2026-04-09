const pool = require('../db/connection');

const findById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
  return rows[0] ?? null;
};

const findItemsByOrderId = async (orderId) => {
  const [rows] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  return rows;
};

const findMany = async ({ status, from, to, cursor, limit }) => {
  const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const safeCursor = Math.max(parseInt(cursor) || 0, 0);

  const conditions = [];
  const params = [];

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (from)   { conditions.push('created_at >= ?'); params.push(from); }
  if (to)     { conditions.push('created_at <= ?'); params.push(to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')} AND id > ${safeCursor}` : `WHERE id > ${safeCursor}`;

  const [rows] = await pool.execute(
    `SELECT * FROM orders ${where} ORDER BY id ASC LIMIT ${safeLimit}`,
    params
  );
  return rows;
};

const updateStatus = async (conn, id, status) => {
  await conn.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
};

const createWithItems = async (conn, { customer_id, total_cents, enrichedItems }) => {
  const [order] = await conn.execute(
    'INSERT INTO orders (customer_id, status, total_cents) VALUES (?, "CREATED", ?)',
    [customer_id, total_cents]
  );

  for (const item of enrichedItems) {
    await conn.execute(
      'INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES (?, ?, ?, ?, ?)',
      [order.insertId, item.product_id, item.qty, item.unit_price_cents, item.subtotal_cents]
    );
  }

  return order.insertId;
};

module.exports = { findById, findItemsByOrderId, findMany, updateStatus, createWithItems };