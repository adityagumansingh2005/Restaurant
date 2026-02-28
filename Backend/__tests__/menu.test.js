/**
 * Unit Tests - Menu API
 */

const { getMenu } = require('../src/handlers/menu');

describe('Menu API', () => {
  test('GET /menu - should return 200 with menu data', async () => {
    const event = {};
    const result = await getMenu(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  test('GET /menu - should contain appetizers, mains, and desserts categories', async () => {
    const result = await getMenu({});
    const body = JSON.parse(result.body);

    expect(body.data.appetizers).toBeDefined();
    expect(body.data.mains).toBeDefined();
    expect(body.data.desserts).toBeDefined();
  });

  test('GET /menu - appetizers should have correct structure', async () => {
    const result = await getMenu({});
    const body = JSON.parse(result.body);

    body.data.appetizers.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('price');
      expect(typeof item.id).toBe('number');
      expect(typeof item.name).toBe('string');
      expect(typeof item.price).toBe('number');
    });
  });

  test('GET /menu - mains should have correct structure', async () => {
    const result = await getMenu({});
    const body = JSON.parse(result.body);

    body.data.mains.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('price');
    });
  });

  test('GET /menu - desserts should have correct structure', async () => {
    const result = await getMenu({});
    const body = JSON.parse(result.body);

    body.data.desserts.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('price');
    });
  });

  test('GET /menu - should have at least 2 items per category', async () => {
    const result = await getMenu({});
    const body = JSON.parse(result.body);

    expect(body.data.appetizers.length).toBeGreaterThanOrEqual(2);
    expect(body.data.mains.length).toBeGreaterThanOrEqual(2);
    expect(body.data.desserts.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /menu - all prices should be positive numbers', async () => {
    const result = await getMenu({});
    const body = JSON.parse(result.body);

    const allItems = [
      ...body.data.appetizers,
      ...body.data.mains,
      ...body.data.desserts,
    ];

    allItems.forEach(item => {
      expect(item.price).toBeGreaterThan(0);
    });
  });

  test('GET /menu - should include CORS headers', async () => {
    const result = await getMenu({});

    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
  });
});
