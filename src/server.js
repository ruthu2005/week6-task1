/**
 * Server Entry Point
 * Starts HTTP listener on specified PORT.
 */

const app = require('./app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 JWT Authentication Server running on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`📑 API Endpoints Base: http://localhost:${PORT}/api/users`);
  console.log(`🖥️  Interactive Dashboard: http://localhost:${PORT}`);
  console.log('====================================================');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
  });
});
