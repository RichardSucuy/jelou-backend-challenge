const pool = require('../db/connection');
const axios = require('axios');
const orderRepo = require('../repositories/order.repository');
const { orderSchema } = require('../schemas/order.schema');

const create = async (req, res) => {
  const result = orderSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const { customer_id, items } = result.data;

  try {
    await axios.get(
      `${process.env.CUSTOMERS_API_BASE}/internal/customers/${customer_id}`,
      { headers: { Authorization: `Bearer ${process.env.SERVICE_TOKEN}` } }
    );
  } catch {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let total_cents = 0;
    const enrichedItems = [];

    for (const item of items) {
      const [rows] = await conn.execute('SELECT * FROM products WHERE id = ? FOR UPDATE', [item.product_id]);
      if (!rows.length) throw { status: 404, message: `Producto ${item.product_id} no encontrado` };
      if (rows[0].stock < item.qty) throw { status: 409, message: `Stock insuficiente para producto ${item.product_id}` };

      const subtotal = rows[0].price_cents * item.qty;
      total_cents += subtotal;
      enrichedItems.push({ product_id: item.product_id, qty: item.qty, unit_price_cents: rows[0].price_cents, subtotal_cents: subtotal });

      await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.qty, item.product_id]);
    }

    const orderId = await orderRepo.createWithItems(conn, { customer_id, total_cents, enrichedItems });
    await conn.commit();

    const order = await orderRepo.findById(orderId);
    const orderItems = await orderRepo.findItemsByOrderId(orderId);
    return res.status(201).json({ ...order, items: orderItems });
  } catch (err) {
    await conn.rollback();
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Error interno' });
  } finally {
    conn.release();
  }
};

const getById = async (req, res) => {
  const order = await orderRepo.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  const items = await orderRepo.findItemsByOrderId(req.params.id);
  return res.json({ ...order, items });
};

const search = async (req, res) => {
  const { status, from, to, cursor = 0, limit = 10 } = req.query;
  const rows = await orderRepo.findMany({ status, from, to, cursor, limit });
  const nextCursor = rows.length === Number(limit) ? rows[rows.length - 1].id : null;
  return res.json({ data: rows, nextCursor });
};

const confirm = async (req, res) => {
  const order = await orderRepo.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  if (order.status !== 'CREATED') return res.status(409).json({ error: `No se puede confirmar una orden en estado ${order.status}` });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await orderRepo.updateStatus(conn, req.params.id, 'CONFIRMED');
    await conn.commit();
  } catch {
    await conn.rollback();
    return res.status(500).json({ error: 'Error interno' });
  } finally {
    conn.release();
  }

  const updated = await orderRepo.findById(req.params.id);
  const items = await orderRepo.findItemsByOrderId(req.params.id);
  return res.json({ ...updated, items });
};

const cancel = async (req, res) => {
  const order = await orderRepo.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  if (order.status === 'CANCELED') return res.status(409).json({ error: 'Orden ya cancelada' });

  if (order.status === 'CONFIRMED') {
    const diffMinutes = (Date.now() - new Date(order.created_at).getTime()) / 60000;
    if (diffMinutes > 10) return res.status(409).json({ error: 'No se puede cancelar una orden confirmada después de 10 minutos' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const items = await orderRepo.findItemsByOrderId(order.id);
    for (const item of items) {
      await conn.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.qty, item.product_id]);
    }
    await orderRepo.updateStatus(conn, order.id, 'CANCELED');
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