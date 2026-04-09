const pool = require('../../db/connection');

const cleanCustomers = async () => {
  await pool.execute("DELETE FROM customers WHERE email LIKE '%@test.local'");
};

module.exports = { cleanCustomers, pool };