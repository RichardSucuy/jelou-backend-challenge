const express = require('express');
const customerRoutes = require('./routes/customers');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'customers-api' }));
app.use('/customers', customerRoutes);
app.use('/internal/customers', require('./routes/internal'));

module.exports = app;