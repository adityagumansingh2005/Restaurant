/**
 * Unit Tests - Menu CRUD API
 */

// Mock the menu utility module
jest.mock('../src/utils/menu', () => {
  const items = {};

  return {
    createMenuItem: jest.fn(async (data) => {
      const item = { itemId: 'test-id-1', ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      items[item.itemId] = item;
      return item;
    }),
    getMenuItemById: jest.fn(async (id) => items[id] || null),
    getMenuItemsByCategory: jest.fn(async (category) =>
      Object.values(items).filter((i) => i.category === category)
    ),
    getAllMenuItems: jest.fn(async () => Object.values(items)),
    updateMenuItem: jest.fn(async (id, data) => {
      if (!items[id]) return null;
      items[id] = { ...items[id], ...data, updatedAt: new Date().toISOString() };
      return items[id];
    }),
    deleteMenuItem: jest.fn(async (id) => {
      delete items[id];
      return true;
    }),
  };
});

const { getMenu, getMenuItem, createMenuItem, updateMenuItem, deleteMenuItem } = require('../src/handlers/menu');

describe('Menu CRUD API', () => {
  // ---- GET /menu ----
  test('GET /menu - should return 200 with menu data', async () => {
    const event = {};
    const result = await getMenu(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.items).toBeDefined();
  });

  test('GET /menu?category=mains - should filter by category', async () => {
    const event = { queryStringParameters: { category: 'mains' } };
    const result = await getMenu(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
  });

  test('GET /menu - should include CORS headers', async () => {
    const result = await getMenu({});
    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  // ---- POST /menu ----
  test('POST /menu - should create a menu item with valid data', async () => {
    const event = {
      body: JSON.stringify({ name: 'Spring Rolls', price: 5.99, category: 'appetizers', description: 'Crispy rolls' }),
    };
    const result = await createMenuItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Spring Rolls');
    expect(body.data.price).toBe(5.99);
    expect(body.data.category).toBe('appetizers');
  });

  test('POST /menu - should return 400 when name is missing', async () => {
    const event = { body: JSON.stringify({ price: 5.99, category: 'appetizers' }) };
    const result = await createMenuItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
  });

  test('POST /menu - should return 400 when price is missing', async () => {
    const event = { body: JSON.stringify({ name: 'Soup', category: 'appetizers' }) };
    const result = await createMenuItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
  });

  test('POST /menu - should return 400 when category is missing', async () => {
    const event = { body: JSON.stringify({ name: 'Soup', price: 4.99 }) };
    const result = await createMenuItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
  });

  // ---- GET /menu/{id} ----
  test('GET /menu/:id - should return a menu item', async () => {
    const event = { pathParameters: { id: 'test-id-1' } };
    const result = await getMenuItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.itemId).toBe('test-id-1');
  });

  test('GET /menu/:id - should return 404 for non-existent item', async () => {
    const event = { pathParameters: { id: 'non-existent' } };
    const result = await getMenuItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(404);
    expect(body.success).toBe(false);
  });

  test('GET /menu/:id - should return 400 when id is missing', async () => {
    const event = { pathParameters: {} };
    const result = await getMenuItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
  });

  // ---- PUT /menu/{id} ----
  test('PUT /menu/:id - should update a menu item', async () => {
    const event = {
      pathParameters: { id: 'test-id-1' },
      body: JSON.stringify({ name: 'Updated Rolls', price: 6.99 }),
    };
    const result = await updateMenuItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
  });

  test('PUT /menu/:id - should return 404 for non-existent item', async () => {
    const event = {
      pathParameters: { id: 'non-existent' },
      body: JSON.stringify({ name: 'Test' }),
    };
    const result = await updateMenuItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(404);
    expect(body.success).toBe(false);
  });

  test('PUT /menu/:id - should return 400 when no valid fields', async () => {
    const event = {
      pathParameters: { id: 'test-id-1' },
      body: JSON.stringify({ invalidField: 'data' }),
    };
    const result = await updateMenuItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
  });

  // ---- DELETE /menu/{id} ----
  test('DELETE /menu/:id - should delete a menu item', async () => {
    const event = { pathParameters: { id: 'test-id-1' } };
    const result = await deleteMenuItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
  });

  test('DELETE /menu/:id - should return 404 for non-existent item', async () => {
    const event = { pathParameters: { id: 'already-deleted' } };
    const result = await deleteMenuItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(404);
    expect(body.success).toBe(false);
  });
});
