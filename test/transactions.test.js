const request = require('supertest');
const app = require('../index');

describe('Transaction API', () => {
  it('GET /transactions returns 200', async () => {
    const res = await request(app).get('/transactions');
    expect(res.statusCode).toBe(200);
  });
});