const request = require('supertest');
const app = require('../../app');

const { createCustomerData } = require('../helpers/factory');
const { authHeader } = require('../helpers/auth');

describe('POST /customers', () => {

  it('crea un cliente válido → 201', async () => {
    const data = createCustomerData();

    const res = await request(app)
    .post('/customers')
    .set(authHeader())
    .send(data);

    console.log('FINAL:', res.status, res.body);
    
    expect(res.status).toBe(201); // 👈 ESTO FALTABA
  });

});