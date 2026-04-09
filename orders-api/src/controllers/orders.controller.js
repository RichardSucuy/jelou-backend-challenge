const pool = require('../db/connection');
const axios = require('axios');
const { z } = require('zod');

const orderSchema = z.object({
  customer_id: z.number().int().positive(),
  items: z.array(z.object({
    product_id: z.number().int().positive(),
    qty: z.number().int().positive(),
  })).min(1),
});

const create = async (req, res) => {
  const result = orderSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const { customer_id, items } = result.data;
  const conn = await pool.getConnection();

  try {
    // Validar cliente en Customers API
    await axios.get(
      `${process.env.CUSTOMERS_API_BASE}/internal/customers/${customer_id}`,
      { headers: { Authorization: `Bearer ${process.env.SERVICE_TOKEN}` } }
    );
  } catch {
    conn.release();
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  try {
    await conn.beginTransaction();

    let total_cents = 0;
    const enrichedItems = [];

    for (const item of items) {
      const [rows] = await conn.execute(
        'SELECT * FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );
      if (!rows.length) throw { status: 404, message: `Producto ${item.product_id} no encontrado` };
      if (rows[0].stock < item.qty) throw { status: 409, message: `Stock insuficiente para producto ${item.product_id}` };

      const subtotal = rows[0].price_cents * item.qty;
      total_cents += subtotal;
      enrichedItems.push({
        product_id: item.product_id,
        qty: item.qty,
        unit_price_cents: rows[0].price_cents,
        subtotal_cents: subtotal,
      });

      await conn.execute(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.qty, item.product_id]
      );
    }

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

    await conn.commit();

    const [orders] = await conn.execute('SELECT * FROM orders WHERE id = ?', [order.insertId]);
    const [orderItems] = await conn.execute('SELECT * FROM order_items WHERE order_id = ?', [order.insertId]);

    return res.status(201).json({ ...orders[0], items: orderItems });
  } catch (err) {
    await conn.rollback();
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Error interno' });
  } finally {
    conn.release();
  }
};

const getById = async (req, res) => {
  const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!orders.length) return res.status(404).json({ error: 'Orden no encontrada' });

  const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
  return res.json({ ...orders[0], items });
};

const search = async (req, res) => {
  const { status, from, to, cursor = 0, limit = 10 } = req.query;
  const conditions = ['id > ?'];
  const params = [Number(cursor)];

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (from) { conditions.push('created_at >= ?'); params.push(from); }
  if (to) { conditions.push('created_at <= ?'); params.push(to); }

  params.push(Number(limit));

  const [rows] = await pool.execute(
    `SELECT * FROM orders WHERE ${conditions.join(' AND ')} ORDER BY id ASC LIMIT ?`,
    params
  );

  const nextCursor = rows.length === Number(limit) ? rows[rows.length - 1].id : null;
  return res.json({ data: rows, nextCursor });
};

const confirm = async (req, res) => {
  const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!orders.length) return res.status(404).json({ error: 'Orden no encontrada' });
  if (orders[0].status !== 'CREATED') {
    return res.status(409).json({ error: `No se puede confirmar una orden en estado ${orders[0].status}` });
  }

  await pool.execute(
    'UPDATE orders SET status = "CONFIRMED" WHERE id = ?',
    [req.params.id]
  );

  const [updated] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);

  return res.json({ ...updated[0], items });
};

const cancel = async (req, res) => {
  const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!orders.length) return res.status(404).json({ error: 'Orden no encontrada' });

  const order = orders[0];

  if (order.status === 'CANCELED') {
    return res.status(409).json({ error: 'Orden ya cancelada' });
  }

  if (order.status === 'CONFIRMED') {
    const diffMinutes = (Date.now() - new Date(order.created_at).getTime()) / 60000;
    if (diffMinutes > 10) {
      return res.status(409).json({ error: 'No se puede cancelar una orden confirmada después de 10 minutos' });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [items] = await conn.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    for (const item of items) {
      await conn.execute(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.qty, item.product_id]
      );
    }

    await conn.execute('UPDATE orders SET status = "CANCELED" WHERE id = ?', [order.id]);
    await conn.commit();

    return res.json({ message: 'Orden cancelada', order_id: order.id });
  } catch {
    await conn.rollback();
    return res.status(500).json({ error: 'Error interno' });
  } finally {
    conn.release();
  }
};

module.exports = { create, getById, search, confirm, cancel };