'use strict';
require('dotenv').config();
const axios = require('axios');

const CUSTOMERS_API = process.env.CUSTOMERS_API_BASE;
const ORDERS_API = process.env.ORDERS_API_BASE;
const SERVICE_TOKEN = process.env.SERVICE_TOKEN;

module.exports.createAndConfirmOrder = async (event) => {
  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return response(400, { error: 'Body inválido' });
  }

  const { customer_id, items, idempotency_key, correlation_id } = body;

  if (!customer_id || !items?.length || !idempotency_key) {
    return response(400, { error: 'customer_id, items e idempotency_key son requeridos' });
  }

  try {
    // 1. Validar cliente
    const customerRes = await axios.get(
      `${CUSTOMERS_API}/internal/customers/${customer_id}`,
      { headers: { Authorization: `Bearer ${SERVICE_TOKEN}` } }
    );
    const customer = customerRes.data;

    // 2. Crear orden
    const orderRes = await axios.post(
      `${ORDERS_API}/orders`,
      { customer_id, items },
      { headers: { Authorization: `Bearer ${SERVICE_TOKEN}`, 'Content-Type': 'application/json' } }
    );
    const order = orderRes.data;

    // 3. Confirmar orden
    const confirmRes = await axios.post(
      `${ORDERS_API}/orders/${order.id}/confirm`,
      {},
      {
        headers: {
          Authorization: `Bearer ${SERVICE_TOKEN}`,
          'X-Idempotency-Key': idempotency_key,
        },
      }
    );
    const confirmed = confirmRes.data;

    return response(201, {
      success: true,
      correlationId: correlation_id || null,
      data: {
        customer,
        order: {
          id: confirmed.id,
          status: confirmed.status,
          total_cents: confirmed.total_cents,
          items: confirmed.items,
        },
      },
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.error || 'Error interno del orquestador';
    return response(status, { success: false, error: message });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});