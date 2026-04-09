// tests/setup.js
require('dotenv').config();

// process.env.JWT_SECRET = 'supersecretjwt'; // 👈 AGREGA ESTO

// // 👇 AGREGA ESTO
// process.env.DB_HOST = 'localhost';
// process.env.DB_USER = 'root';
// process.env.DB_PASSWORD = 'root'; // tu password real
// process.env.DB_NAME = 'customers_db';

const { pool, cleanCustomers } = require('./helpers/db');

beforeAll(async () => {
  await pool.execute('SELECT 1'); // valida conexión real
});

afterEach(async () => {
  await cleanCustomers(); // aislamiento
});

afterAll(async () => {
  await cleanCustomers();
  await pool.end(); // CRÍTICO: cerrar pool
});