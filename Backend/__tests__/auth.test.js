/**
 * Unit Tests - Auth API (formatResponse helper & input validation)
 * 
 * Since auth handlers call AWS Cognito directly, we mock the Cognito SDK
 * to test the handler logic (validation, error handling, response format)
 * without making real AWS calls.
 */

// Mock aws-sdk before requiring the handler
jest.mock('aws-sdk/clients/cognitoidentityserviceprovider', () => {
  return jest.fn(() => ({
    signUp: jest.fn().mockReturnValue({
      promise: () => Promise.resolve({ UserSub: 'mock-user-sub-123' }),
    }),
    adminConfirmSignUp: jest.fn().mockReturnValue({
      promise: () => Promise.resolve({}),
    }),
    adminInitiateAuth: jest.fn().mockReturnValue({
      promise: () =>
        Promise.resolve({
          AuthenticationResult: {
            AccessToken: 'mock-access-token',
            IdToken: 'mock-id-token',
            RefreshToken: 'mock-refresh-token',
          },
        }),
    }),
    adminGetUser: jest.fn().mockReturnValue({
      promise: () =>
        Promise.resolve({
          Username: 'mock@test.com',
          UserAttributes: [
            { Name: 'sub', Value: 'mock-user-sub-123' },
            { Name: 'email', Value: 'mock@test.com' },
            { Name: 'given_name', Value: 'Mock' },
            { Name: 'family_name', Value: 'User' },
            { Name: 'phone_number', Value: '+1234567890' },
          ],
        }),
    }),
    getUser: jest.fn().mockReturnValue({
      promise: () =>
        Promise.resolve({
          Username: 'mock@test.com',
          UserAttributes: [
            { Name: 'sub', Value: 'mock-user-sub-123' },
            { Name: 'email', Value: 'mock@test.com' },
            { Name: 'given_name', Value: 'Mock' },
            { Name: 'family_name', Value: 'User' },
          ],
        }),
    }),
  }));
});

jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      put: jest.fn().mockReturnValue({ promise: () => Promise.resolve({}) }),
      get: jest.fn().mockReturnValue({ promise: () => Promise.resolve({ Item: null }) }),
      query: jest.fn().mockReturnValue({ promise: () => Promise.resolve({ Items: [] }) }),
    })),
  },
}));

// Set environment variables for the auth handler
process.env.COGNITO_REGION = 'us-east-1';
process.env.COGNITO_USER_POOL_ID = 'us-east-1_MockPool';
process.env.COGNITO_CLIENT_ID = 'mock-client-id';
process.env.COGNITO_CLIENT_SECRET = '';

const { signup, login } = require('../src/handlers/auth');

describe('Auth API', () => {
  // ─── SIGNUP ─────────────────────────────────────────────────
  describe('POST /auth/signup', () => {
    test('should return 400 if email is missing', async () => {
      const event = {
        body: JSON.stringify({ password: 'StrongPass1!' }),
      };
      const result = await signup(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toContain('Email and password are required');
    });

    test('should return 400 if password is missing', async () => {
      const event = {
        body: JSON.stringify({ email: 'test@test.com' }),
      };
      const result = await signup(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toContain('Email and password are required');
    });

    test('should return 400 if password is too short', async () => {
      const event = {
        body: JSON.stringify({ email: 'test@test.com', password: 'short' }),
      };
      const result = await signup(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toContain('8 characters');
    });

    test('should return 400 if body is empty', async () => {
      const event = { body: '{}' };
      const result = await signup(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
    });

    test('should successfully sign up with valid data (mocked Cognito)', async () => {
      const event = {
        body: JSON.stringify({
          email: 'newuser@test.com',
          password: 'ValidPass1!',
          firstName: 'New',
          lastName: 'User',
          phone: '+1234567890',
        }),
      };
      const result = await signup(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(body.success).toBe(true);
      expect(body.message).toContain('registered');
      expect(body.data).toBeDefined();
      expect(body.data.userId).toBe('mock-user-sub-123');
      expect(body.data.email).toBe('newuser@test.com');
      expect(body.data.tokens).toBeDefined();
    });

    test('should include CORS headers on signup response', async () => {
      const event = {
        body: JSON.stringify({ email: 'cors@test.com', password: 'ValidPass1!' }),
      };
      const result = await signup(event);

      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    test('should handle null body gracefully', async () => {
      const event = { body: null };
      const result = await signup(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  // ─── LOGIN ──────────────────────────────────────────────────
  describe('POST /auth/login', () => {
    test('should return 400 if email is missing', async () => {
      const event = {
        body: JSON.stringify({ password: 'SomePass1!' }),
      };
      const result = await login(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
    });

    test('should return 400 if password is missing', async () => {
      const event = {
        body: JSON.stringify({ email: 'test@test.com' }),
      };
      const result = await login(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
    });

    test('should return 400 if body is empty', async () => {
      const event = { body: '{}' };
      const result = await login(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
    });

    test('should successfully login with valid credentials (mocked Cognito)', async () => {
      const event = {
        body: JSON.stringify({
          email: 'newuser@test.com',
          password: 'ValidPass1!',
        }),
      };
      const result = await login(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.tokens).toBeDefined();
      expect(body.data.tokens.accessToken).toBe('mock-access-token');
      expect(body.data.tokens.idToken).toBe('mock-id-token');
    });

    test('should include CORS headers on login response', async () => {
      const event = {
        body: JSON.stringify({ email: 'test@test.com', password: 'ValidPass1!' }),
      };
      const result = await login(event);

      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });
});
