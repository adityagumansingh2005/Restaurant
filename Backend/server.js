/**
 * Local Server for Testing
 * Runs the API on http://localhost:3000
 */

const app = require('./app');
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`🚀 Restaurant API Server Running`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`\n📋 Available Endpoints:\n`);
  console.log(`   GET    http://localhost:${PORT}/health`);
  console.log(`   GET    http://localhost:${PORT}/menu`);
  console.log(`   POST   http://localhost:${PORT}/orders`);
  console.log(`   GET    http://localhost:${PORT}/orders`);
  console.log(`   GET    http://localhost:${PORT}/orders/:id`);
  console.log(`   PUT    http://localhost:${PORT}/orders/:id`);
  console.log(`   DELETE http://localhost:${PORT}/orders/:id`);
  console.log(`\n═══════════════════════════════════════════════════════════\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

module.exports = server;
