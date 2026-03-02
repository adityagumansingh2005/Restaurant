/**
 * Express App Configuration
 * Sets up routes and middleware for local testing
 */

const express = require('express');
const cors = require('cors');
const { verifyToken, extractToken } = require('./src/utils/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.path}`);
  console.log(`⏰ ${new Date().toISOString()}`);
  next();
});

// Import handlers
const authHandler = require('./src/handlers/auth');
const menuHandler = require('./src/handlers/menu');
const ordersHandler = require('./src/handlers/orders');
const checkoutHandler = require('./src/handlers/checkout');
const healthHandler = require('./src/handlers/health');
const reservationsHandler = require('./src/handlers/reservations');

// Convert Lambda handlers to Express routes
const lambdaHandler = (handler, requireAuth = false) => {
  return async (req, res) => {
    try {
      // Check authentication if required
      let userId = null;
      let decoded = null;
      if (requireAuth) {
        const token = extractToken(req.headers.authorization);
        if (!token) {
          return res.status(401).json({
            success: false,
            error: 'Authorization token required',
          });
        }

        try {
          decoded = await verifyToken(token);
          userId = decoded.userId;
          req.userId = userId;
        } catch (error) {
          return res.status(401).json({
            success: false,
            error: error.message,
          });
        }
      }

      const event = {
        httpMethod: req.method,
        path: req.path,
        pathParameters: req.params,
        queryStringParameters: req.query,
        body: req.body ? JSON.stringify(req.body) : null,
        headers: req.headers,
        requestContext: {
          authorizer: {
            userId,
            claims: decoded, // Include full Cognito claims
          },
        },
      };

      const result = await handler(event);

      // Parse body if it's a string
      const body = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;

      res.status(result.statusCode || 200)
        .set(result.headers || { 'Content-Type': 'application/json' })
        .json(body);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };
};

// ============================================================
// Authentication Routes (No Auth Required)
// ============================================================
app.post('/auth/signup', lambdaHandler(authHandler.signup, false));
app.post('/auth/login', lambdaHandler(authHandler.login, false));
app.post('/auth/refresh', lambdaHandler(authHandler.refresh, false));
app.post('/auth/logout', lambdaHandler(authHandler.logout, false));

// ✅ OTP-Based Authentication Routes
app.post('/auth/send-otp', lambdaHandler(authHandler.sendOTP, false));
app.post('/auth/verify-otp', lambdaHandler(authHandler.verifyOTP, false));
app.post('/auth/resend-otp', lambdaHandler(authHandler.resendOTP, false));
app.post('/auth/set-password', lambdaHandler(authHandler.setPassword, false));

// ============================================================
// Health Check Routes
// ============================================================
app.get('/health', lambdaHandler(healthHandler.check, false));

// ============================================================
// Menu Routes (GET is public, CUD requires Auth)
// ============================================================
app.get('/menu', lambdaHandler(menuHandler.getMenu, false));
app.get('/menu/:id', lambdaHandler(menuHandler.getMenuItem, false));
app.post('/menu', lambdaHandler(menuHandler.createMenuItem, true));
app.put('/menu/:id', lambdaHandler(menuHandler.updateMenuItem, true));
app.delete('/menu/:id', lambdaHandler(menuHandler.deleteMenuItem, true));

// ============================================================
// Orders Routes (Auth Required for POST, PUT, DELETE)
// ============================================================
app.post('/orders', lambdaHandler(ordersHandler.createOrder, true));
app.get('/orders', lambdaHandler(ordersHandler.getOrders, true));
app.get('/orders/:id', lambdaHandler(ordersHandler.getOrder, true));
app.put('/orders/:id', lambdaHandler(ordersHandler.updateOrder, true));
app.delete('/orders/:id', lambdaHandler(ordersHandler.deleteOrder, true));

// ============================================================
// Reservations Routes (Auth Required for POST, PUT, DELETE)
// ============================================================
app.post('/reservations', lambdaHandler(reservationsHandler.createReservation, true));
app.get('/reservations', lambdaHandler(reservationsHandler.getReservations, true));
app.get('/reservations/:id', lambdaHandler(reservationsHandler.getReservation, true));
app.put('/reservations/:id', lambdaHandler(reservationsHandler.updateReservation, true));
app.delete('/reservations/:id', lambdaHandler(reservationsHandler.deleteReservation, true));

// ============================================================
// Checkout Routes (Stripe)
// ============================================================
app.post('/checkout/session', lambdaHandler(checkoutHandler.createCheckoutSession, true));
app.post('/checkout/confirm', lambdaHandler(checkoutHandler.confirmPayment, true));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} does not exist`,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(`\n🔴 Unhandled Error:\n`, err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message,
  });
});

module.exports = app;
