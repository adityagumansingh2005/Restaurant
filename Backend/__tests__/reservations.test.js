/**
 * Unit Tests - Reservations API
 * Mocks the DynamoDB reservations util with the in-memory mock version
 */

// Mock the real reservations util with the mock version BEFORE requiring handlers
jest.mock('../src/utils/reservations', () => require('../src/utils/reservations-mock'));

const {
  createReservation,
  getReservations,
  getReservation,
  updateReservation,
  deleteReservation,
} = require('../src/handlers/reservations');

// Helper: build mock event with JWT auth (AWS Lambda httpApi format)
const mockJwtEvent = (body = {}, pathParameters = null) => ({
  body: JSON.stringify(body),
  pathParameters,
  requestContext: {
    authorizer: {
      jwt: {
        claims: {
          sub: 'mock-user-001',
          email: 'mock@restaurant.com',
        },
      },
    },
  },
});

// Helper: build mock event with local auth format (app.js format)
const mockLocalAuthEvent = (body = {}, pathParameters = null) => ({
  body: JSON.stringify(body),
  pathParameters,
  requestContext: {
    authorizer: {
      claims: {
        sub: 'mock-user-002',
        email: 'local@restaurant.com',
      },
    },
  },
});

// Helper: unauthenticated event
const mockUnauthEvent = (body = {}, pathParameters = null) => ({
  body: JSON.stringify(body),
  pathParameters,
  requestContext: {},
});

// Mock reservation data
const mockReservationData = {
  name: 'John Doe',
  dateTime: '2026-03-15T19:00:00Z',
  partySize: 4,
  phone: '+1234567890',
};

describe('Reservations API', () => {
  let createdReservationId;

  // ─── CREATE RESERVATION ───────────────────────────────────────
  describe('POST /reservations - createReservation', () => {
    test('should create a reservation with JWT auth and valid data', async () => {
      const event = mockJwtEvent(mockReservationData);
      const result = await createReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.reservationId).toBeDefined();
      expect(body.data.userId).toBe('mock-user-001');
      expect(body.data.userEmail).toBe('mock@restaurant.com');
      expect(body.data.name).toBe('John Doe');
      expect(body.data.dateTime).toBe('2026-03-15T19:00:00Z');
      expect(body.data.partySize).toBe(4);
      expect(body.data.phone).toBe('+1234567890');
      expect(body.data.status).toBe('pending');
      expect(body.data.createdAt).toBeDefined();

      createdReservationId = body.data.reservationId;
    });

    test('should create a reservation with local auth format', async () => {
      const event = mockLocalAuthEvent({
        name: 'Jane Smith',
        dateTime: '2026-04-01T20:00:00Z',
        partySize: 2,
      });
      const result = await createReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.userId).toBe('mock-user-002');
    });

    test('should return 400 when dateTime is missing', async () => {
      const event = mockJwtEvent({ name: 'John', partySize: 3 });
      const result = await createReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('dateTime');
    });

    test('should return 400 when partySize is missing', async () => {
      const event = mockJwtEvent({ name: 'John', dateTime: '2026-03-15T19:00:00Z' });
      const result = await createReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('partySize');
    });

    test('should return 400 when not authenticated (no userId)', async () => {
      const event = mockUnauthEvent(mockReservationData);
      const result = await createReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
    });

    test('should default name and phone to empty strings if not provided', async () => {
      const event = mockJwtEvent({
        dateTime: '2026-05-01T18:00:00Z',
        partySize: 6,
      });
      const result = await createReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(body.data.name).toBe('');
      expect(body.data.phone).toBe('');
    });

    test('should include CORS headers', async () => {
      const event = mockJwtEvent(mockReservationData);
      const result = await createReservation(event);

      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  // ─── GET USER'S RESERVATIONS ──────────────────────────────────
  describe('GET /reservations - getReservations', () => {
    test('should return reservations for authenticated JWT user', async () => {
      const event = mockJwtEvent();
      const result = await getReservations(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      // User mock-user-001 created reservations above
      expect(body.data.length).toBeGreaterThan(0);
    });

    test('should return reservations for local auth user', async () => {
      const event = mockLocalAuthEvent();
      const result = await getReservations(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    test('should return 401 when not authenticated', async () => {
      const event = mockUnauthEvent();
      const result = await getReservations(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Authentication required');
    });

    test('should return empty array for user with no reservations', async () => {
      const event = {
        body: '{}',
        requestContext: {
          authorizer: {
            jwt: {
              claims: { sub: 'no-reservations-user', email: 'none@test.com' },
            },
          },
        },
      };
      const result = await getReservations(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data).toEqual([]);
    });
  });

  // ─── GET SINGLE RESERVATION ───────────────────────────────────
  describe('GET /reservations/{id} - getReservation', () => {
    test('should return a specific reservation by id', async () => {
      const event = { pathParameters: { id: createdReservationId } };
      const result = await getReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.reservationId).toBe(createdReservationId);
      expect(body.data.name).toBe('John Doe');
    });

    test('should return 404 for non-existent reservation', async () => {
      const event = { pathParameters: { id: 'non-existent-id' } };
      const result = await getReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Reservation not found');
    });
  });

  // ─── UPDATE RESERVATION ────────────────────────────────────────
  describe('PUT /reservations/{id} - updateReservation', () => {
    test('should update a reservation with auth', async () => {
      const event = mockJwtEvent(
        { partySize: 6, name: 'John Updated' },
        { id: createdReservationId }
      );
      const result = await updateReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.partySize).toBe(6);
      expect(body.data.name).toBe('John Updated');
      expect(body.data.updatedAt).toBeDefined();
    });

    test('should return 401 when not authenticated', async () => {
      const event = mockUnauthEvent(
        { partySize: 8 },
        { id: createdReservationId }
      );
      const result = await updateReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(body.success).toBe(false);
    });

    test('should return 404 for non-existent reservation', async () => {
      const event = mockJwtEvent({ partySize: 3 }, { id: 'fake-id-999' });
      const result = await updateReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  // ─── DELETE RESERVATION ────────────────────────────────────────
  describe('DELETE /reservations/{id} - deleteReservation', () => {
    test('should return 401 when not authenticated', async () => {
      const event = mockUnauthEvent({}, { id: createdReservationId });
      const result = await deleteReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(body.success).toBe(false);
    });

    test('should return 404 for non-existent reservation', async () => {
      const event = mockJwtEvent({}, { id: 'non-existent' });
      const result = await deleteReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(body.success).toBe(false);
    });

    test('should delete an existing reservation with auth', async () => {
      const event = mockJwtEvent({}, { id: createdReservationId });
      const result = await deleteReservation(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Deleted');
    });

    test('should confirm deletion - getReservation returns 404', async () => {
      const event = { pathParameters: { id: createdReservationId } };
      const result = await getReservation(event);

      expect(result.statusCode).toBe(404);
    });
  });
});
