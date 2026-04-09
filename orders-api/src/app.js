const express = require('express');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'orders-api' }));
app.use('/products', require('./routes/products'));
app.use('/orders', require('./routes/orders'));

module.exports = app;