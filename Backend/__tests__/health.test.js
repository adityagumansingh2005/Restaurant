/**
 * Unit Tests - Health Check API
 */

const { check } = require('../src/handlers/health');

describe('Health Check API', () => {
  test('GET /health - should return 200 with success message', async () => {
    const event = {};
    const result = await check(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('API is running');
    expect(body.timestamp).toBeDefined();
    expect(body.environment).toBeDefined();
  });

  test('GET /health - should include CORS headers', async () => {
    const result = await check({});

    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  test('GET /health - timestamp should be a valid ISO string', async () => {
    const result = await check({});
    const body = JSON.parse(result.body);
    const date = new Date(body.timestamp);

    expect(date.toISOString()).toBe(body.timestamp);
  });
});
