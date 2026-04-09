const request = require('supertest');
const app = require('../app');

describe('Health check', () => {

  it('server responde → 200', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
  });

});