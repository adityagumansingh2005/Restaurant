# JWT Authentication Guide

This guide covers the JWT-based authentication system implemented in the Restaurant API.

## Overview

The API uses **JWT (JSON Web Tokens)** for authentication and **bcryptjs** for secure password hashing.

### Key Features
- ✅ User registration (signup)
- ✅ User login with JWT token generation
- ✅ Secure password hashing with bcryptjs
- ✅ Token-based authentication for protected routes
- ✅ DynamoDB storage for user data
- ✅ Email uniqueness validation

## Authentication Endpoints

### 1. Signup - Create New User

**Endpoint:** `POST /auth/signup`

**No authentication required**

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "1234567890"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "1234567890",
      "createdAt": "2026-02-05T12:34:56.000Z",
      "updatedAt": "2026-02-05T12:34:56.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing email or password
- `400 Bad Request` - Password less than 6 characters
- `409 Conflict` - Email already registered

---

### 2. Login - Authenticate User

**Endpoint:** `POST /auth/login`

**No authentication required**

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "1234567890",
      "createdAt": "2026-02-05T12:34:56.000Z",
      "updatedAt": "2026-02-05T12:34:56.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing email or password
- `401 Unauthorized` - Invalid email or password

---

## Protected Routes

The following routes require JWT authentication:

### Create Order

**Endpoint:** `POST /orders`

**Authentication required:** YES

**Example Request:**
```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"id": 1, "name": "Pizza", "price": 12.99}
    ],
    "totalPrice": 12.99,
    "customerName": "John Doe",
    "customerEmail": "john@example.com"
  }'
```

### Update Order

**Endpoint:** `PUT /orders/{id}`

**Authentication required:** YES

### Delete Order

**Endpoint:** `DELETE /orders/{id}`

**Authentication required:** YES

---

## Public Routes

These routes do NOT require authentication:

- `GET /health` - Health check
- `GET /menu` - Get menu items
- `GET /orders` - Get all orders
- `GET /orders/{id}` - Get specific order
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user

---

## Using the JWT Token

Once you login or signup successfully, you'll receive a JWT token in the response.

### How to Use the Token

Include the token in the `Authorization` header with `Bearer` prefix:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Example with cURL

```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"items": [...], "totalPrice": 50}'
```

### Example with JavaScript/Fetch

```javascript
const token = 'YOUR_JWT_TOKEN_HERE';

const response = await fetch('http://localhost:3000/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    items: [...],
    totalPrice: 50,
    customerName: 'John Doe',
    customerEmail: 'john@example.com'
  })
});

const data = await response.json();
console.log(data);
```

### Example with Axios

```javascript
const token = 'YOUR_JWT_TOKEN_HERE';

axios.post('http://localhost:3000/orders', {
  items: [...],
  totalPrice: 50,
  customerName: 'John Doe',
  customerEmail: 'john@example.com'
}, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(response => {
  console.log(response.data);
});
```

---

## Token Information

### Token Structure

JWT tokens have three parts separated by dots:
- **Header:** Algorithm and token type
- **Payload:** User information (userId, email)
- **Signature:** Verification signature

### Token Contents

The token payload contains:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "iat": 1707126896,
  "exp": 1707213296
}
```

### Token Expiration

- Default expiry: **24 hours**
- To extend session: Login again to get a new token

---

## Security Features

### Password Hashing

- Algorithm: **bcryptjs**
- Salt rounds: **10**
- Passwords are never stored in plain text
- Passwords are never returned in API responses

### Token Security

- Algorithm: **HMAC SHA-256**
- Secret key configurable via `JWT_SECRET` environment variable
- Change the secret key in production!

### Best Practices

1. **Never share your token** - Treat it like a password
2. **Use HTTPS in production** - Protect tokens in transit
3. **Store tokens securely** - Use localStorage/sessionStorage with caution
4. **Set a short expiration** - Reduce impact of token compromise
5. **Rotate secrets regularly** - Change `JWT_SECRET` periodically

---

## Environment Configuration

### .env File

```env
# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database
USERS_TABLE=restaurant-users-dev

# AWS Configuration
AWS_REGION=us-east-1
```

### Change for Production

1. Update `JWT_SECRET` to a strong random string
2. Use AWS Secrets Manager for sensitive values
3. Enable HTTPS
4. Add rate limiting to auth endpoints
5. Add CORS restrictions

---

## Testing

### Test Signup

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Test Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Protected Route

```bash
# Replace TOKEN with the token from login response
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"id": 1, "name": "Pizza", "price": 12.99}],
    "totalPrice": 12.99,
    "customerName": "John Doe",
    "customerEmail": "john@example.com"
  }'
```

---

## Troubleshooting

### "Authentication required" Error

**Cause:** Missing or invalid Authorization header

**Solution:** 
- Add the token to the Authorization header
- Ensure format is: `Authorization: Bearer YOUR_TOKEN`

### "Invalid or expired token" Error

**Cause:** Token has expired or been tampered with

**Solution:**
- Login again to get a new token
- Check if JWT_SECRET has changed

### "Email already registered" Error

**Cause:** User already exists with that email

**Solution:**
- Use a different email for signup
- Use login endpoint instead

### "Invalid email or password" Error

**Cause:** Wrong credentials

**Solution:**
- Double-check email and password
- Ensure no typos
- Reset password feature needed (to implement)

---

## File Structure

```
Backend/
├── src/
│   ├── handlers/
│   │   ├── auth.js          # Signup & login handlers
│   │   ├── orders.js        # Order management
│   │   ├── menu.js          # Menu endpoints
│   │   └── health.js        # Health check
│   └── utils/
│       ├── auth.js          # JWT & password utilities
│       └── users.js         # DynamoDB user operations
├── serverless.yml           # Config with DynamoDB table
├── app.js                   # Express setup with auth
├── server.js                # Local server
├── index.js                 # Entry point
└── .env                     # Environment variables
```

---

## Next Steps

1. **Email Verification** - Verify user email before account activation
2. **Password Reset** - Allow users to reset forgotten passwords
3. **Refresh Tokens** - Implement token refresh mechanism
4. **OAuth Integration** - Add Google/Facebook login
5. **Role-Based Access** - Add user roles (admin, user, etc.)
6. **API Key Authentication** - For third-party integrations
7. **Two-Factor Authentication** - Add 2FA for security
8. **Rate Limiting** - Prevent brute force attacks

---

## Support

For issues or questions, please check:
- AWS SDK documentation
- JWT documentation
- bcryptjs documentation
