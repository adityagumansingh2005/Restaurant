/**
 * Unit Tests - Orders API
 * Tests use the in-memory orders storage in the handler
 */

const { createOrder, getOrders, getOrder, updateOrder, deleteOrder } = require('../src/handlers/orders');

// Helper: build a mock event with auth context
const mockAuthEvent = (body = {}, pathParameters = null) => ({
  body: JSON.stringify(body),
  pathParameters,
  requestContext: {
    authorizer: {
      claims: {
        sub: 'test-user-123',
        email: 'test@example.com',
      },
    },
  },
});

// Helper: build an unauthenticated mock event
const mockUnauthEvent = (body = {}, pathParameters = null) => ({
  body: JSON.stringify(body),
  pathParameters,
  requestContext: {},
});

// Mock order data
const mockOrderData = {
  items: [
    { id: 1, name: 'Spring Rolls', quantity: 2, price: 5.99 },
    { id: 3, name: 'Grilled Salmon', quantity: 1, price: 18.99 },
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
      expect(body.data.id).toBeDefined();
      expect(body.data.userId).toBe('test-user-123');
      expect(body.data.userEmail).toBe('test@example.com');
      expect(body.data.items).toEqual(mockOrderData.items);
      expect(body.data.totalPrice).toBe(30.97);
      expect(body.data.status).toBe('pending');
      expect(body.data.createdAt).toBeDefined();

      createdOrderId = body.data.id; // save for later tests
    });

    test('should return 401 when not authenticated', async () => {
      const event = mockUnauthEvent(mockOrderData);
      const result = await createOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Authentication required');
    });

    test('should return 400 for invalid/missing body', async () => {
      const event = {
        body: 'not a json',
        requestContext: {
          authorizer: { claims: { sub: 'test-user-123' } },
        },
      };
      const result = await createOrder(event);

      // Parsing "not a json" throws, handler catches and returns 400
      expect(result.statusCode).toBe(400);
    });

    test('should include CORS headers', async () => {
      const event = mockAuthEvent(mockOrderData);
      const result = await createOrder(event);

      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    test('should create multiple orders independently', async () => {
      const order1 = await createOrder(mockAuthEvent({ items: [{ id: 1, name: 'A' }], totalPrice: 5 }));
      const order2 = await createOrder(mockAuthEvent({ items: [{ id: 2, name: 'B' }], totalPrice: 10 }));

      const body1 = JSON.parse(order1.body);
      const body2 = JSON.parse(order2.body);

      expect(body1.data.id).not.toBe(body2.data.id);
    });
  });

  // ─── GET ALL ORDERS ──────────────────────────────────────────
  describe('GET /orders - getOrders', () => {
    test('should return all orders', async () => {
      const event = {};
      const result = await getOrders(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.count).toBeDefined();
      expect(body.count).toBeGreaterThan(0);
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
      expect(body.data.id).toBe(createdOrderId);
    });

    test('should return 404 for non-existent order', async () => {
      const event = { pathParameters: { id: 'non-existent-id' } };
      const result = await getOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Order not found');
    });
  });

  // ─── UPDATE ORDER ─────────────────────────────────────────────
  describe('PUT /orders/{id} - updateOrder', () => {
    test('should update an existing order with auth', async () => {
      const event = mockAuthEvent(
        { status: 'confirmed', customerName: 'Jane Doe' },
        { id: createdOrderId }
      );
      const result = await updateOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('confirmed');
      expect(body.data.customerName).toBe('Jane Doe');
      expect(body.data.updatedAt).toBeDefined();
      // userId should not change
      expect(body.data.userId).toBe('test-user-123');
    });

    test('should return 401 when not authenticated', async () => {
      const event = mockUnauthEvent(
        { status: 'confirmed' },
        { id: createdOrderId }
      );
      const result = await updateOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(body.success).toBe(false);
    });

    test('should return 404 when updating non-existent order', async () => {
      const event = mockAuthEvent({ status: 'done' }, { id: 'fake-order-id' });
      const result = await updateOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
    });
  });

  // ─── DELETE ORDER ─────────────────────────────────────────────
  describe('DELETE /orders/{id} - deleteOrder', () => {
    test('should return 401 when not authenticated', async () => {
      const event = mockUnauthEvent({}, { id: createdOrderId });
      const result = await deleteOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(body.success).toBe(false);
    });

    test('should return 404 for non-existent order', async () => {
      const event = mockAuthEvent({}, { id: 'does-not-exist' });
      // Need to add pathParameters directly since mockAuthEvent doesn't set it for delete
      event.pathParameters = { id: 'does-not-exist' };
      const result = await deleteOrder(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
    });

    test('should delete an existing order with auth', async () => {
      const event = {
        body: '{}',
        pathParameters: { id: createdOrderId },
        requestContext: {
          authorizer: {
            claims: { sub: 'test-user-123' },
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
