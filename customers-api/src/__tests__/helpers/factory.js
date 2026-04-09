const { randomUUID } = require('crypto');

const createCustomerData = () => {
  const id = randomUUID().slice(0, 8);

  return {
    name: `Test ${id}`,
    email: `test_${id}@mail.com`,
    phone: '1234567890',
  };
};

module.exports = { createCustomerData };