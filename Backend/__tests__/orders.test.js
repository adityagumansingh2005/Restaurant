/**
 * Unit Tests - Orders API (DynamoDB-backed via mock)
 */

// Mock the orders utility module
const store = {};

jest.mock('../src/utils/orders', () => {
  const { v4: uuidv4 } = require('uuid');

  return {
    createOrder: jest.fn(async (data) => {
      const orderId = uuidv4();
      const ts = new Date().toISOString();
      const item = { orderId, ...data, status: 'confirmed', createdAt: ts, updatedAt: ts };
      store[orderId] = item;
      return item;
    }),
    getOrderById: jest.fn(async (id) => store[id] || null),
    getOrdersByUser: jest.fn(async (userId) =>
      Object.values(store).filter((o) => o.userId === userId),
    ),
    updateOrder: jest.fn(async (id, data) => {
      if (!store[id]) return null;
      store[id] = { ...store[id], ...data, updatedAt: new Date().toISOString() };
      return store[id];
    }),
    deleteOrder: jest.fn(async (id) => {
      delete store[id];
      return true;
    }),
  };
});

const { createOrder, getOrders, getOrder, updateOrder, deleteOrder } = require('../src/handlers/orders');

// Helper: build a mock event with auth context (httpApi JWT format)
const mockAuthEvent = (body = {}, pathParameters = null) => ({
  body: JSON.stringify(body),
  pathParameters,
  requestContext: {
    authorizer: {
      jwt: {
        claims: {
          sub: 'test-user-123',
          email: 'test@example.com',
        },
      },
    },
  },
});

// Helper: unauthenticated mock event
const mockUnauthEvent = (body = {}, pathParameters = null) => ({
  body: JSON.stringify(body),
  pathParameters,
  requestContext: {},
});

// Mock order data
const mockOrderData = {
  items: [
    { name: 'Spring Rolls', quantity: 2, price: 5.99 },
    { name: 'Grilled Salmon', quantity: 1, price: 18.99 },
  ],
  totalPrice: 30.97,
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
};

describe('Orders API', () => {
  let createdOrderId;

  // ─── CREATE ORDER ───────────────────────────────────────────
  describe('POST /orders - createOrder', () => {
    test('should create an order with valid data and auth', async () => {
      const event = mockAuthEvent(mockOrderData);
      const result = await createOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.orderId).toBeDefined();
      expect(body.data.userId).toBe('test-user-123');
      expect(body.data.status).toBe('confirmed');
      expect(body.data.createdAt).toBeDefined();

      createdOrderId = body.data.orderId;
    });

    test('should return 401 when not authenticated', async () => {
      const event = mockUnauthEvent(mockOrderData);
      const result = await createOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(body.success).toBe(false);
    });

    test('should return 400 when items are empty', async () => {
      const event = mockAuthEvent({ items: [], totalPrice: 0 });
      const result = await createOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
    });

    test('should return 400 when items are missing', async () => {
      const event = mockAuthEvent({ totalPrice: 10 });
      const result = await createOrder(event);

      expect(result.statusCode).toBe(400);
    });

    test('should include CORS headers', async () => {
      const event = mockAuthEvent(mockOrderData);
      const result = await createOrder(event);

      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  // ─── GET ALL ORDERS ──────────────────────────────────────────
  describe('GET /orders - getOrders', () => {
    test('should return user orders', async () => {
      const event = mockAuthEvent();
      const result = await getOrders(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.count).toBeGreaterThan(0);
    });

    test('should return 401 when not authenticated', async () => {
      const event = mockUnauthEvent();
      const result = await getOrders(event);

      expect(result.statusCode).toBe(401);
    });
  });

  // ─── GET SINGLE ORDER ────────────────────────────────────────
  describe('GET /orders/{id} - getOrder', () => {
    test('should return a specific order by id', async () => {
      const event = { pathParameters: { id: createdOrderId } };
      const result = await getOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.orderId).toBe(createdOrderId);
    });

    test('should return 404 for non-existent order', async () => {
      const event = { pathParameters: { id: 'non-existent-id' } };
      const result = await getOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  // ─── UPDATE ORDER ─────────────────────────────────────────────
  describe('PUT /orders/{id} - updateOrder', () => {
    test('should update an existing order with auth', async () => {
      const event = mockAuthEvent(
        { status: 'delivered', customerName: 'Jane Doe' },
        { id: createdOrderId },
      );
      const result = await updateOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('delivered');
      expect(body.data.customerName).toBe('Jane Doe');
    });

    test('should return 401 when not authenticated', async () => {
      const event = mockUnauthEvent({ status: 'confirmed' }, { id: createdOrderId });
      const result = await updateOrder(event);

      expect(result.statusCode).toBe(401);
    });

    test('should return 404 when updating non-existent order', async () => {
      const event = mockAuthEvent({ status: 'done' }, { id: 'fake-order-id' });
      const result = await updateOrder(event);

      expect(result.statusCode).toBe(404);
    });

    test('should return 400 when no valid fields', async () => {
      const event = mockAuthEvent({ invalidField: 'x' }, { id: createdOrderId });
      const result = await updateOrder(event);

      expect(result.statusCode).toBe(400);
    });
  });

  // ─── DELETE ORDER ─────────────────────────────────────────────
  describe('DELETE /orders/{id} - deleteOrder', () => {
    test('should return 401 when not authenticated', async () => {
      const event = mockUnauthEvent({}, { id: createdOrderId });
      const result = await deleteOrder(event);

      expect(result.statusCode).toBe(401);
    });

    test('should return 404 for non-existent order', async () => {
      const event = mockAuthEvent({}, { id: 'does-not-exist' });
      event.pathParameters = { id: 'does-not-exist' };
      const result = await deleteOrder(event);

      expect(result.statusCode).toBe(404);
    });

    test('should delete an existing order with auth', async () => {
      const event = {
        body: '{}',
        pathParameters: { id: createdOrderId },
        requestContext: {
          authorizer: {
            jwt: { claims: { sub: 'test-user-123' } },
          },
        },
      };
      const result = await deleteOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('deleted');
    });

    test('should return 404 after order is deleted', async () => {
      const event = { pathParameters: { id: createdOrderId } };
      const result = await getOrder(event);

      expect(result.statusCode).toBe(404);
    });
  });
});
