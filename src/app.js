/**
 * Express Application Setup
 * Configures middleware, API routes, static client dashboard, and error handling.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const userRoutes = require('./routes/userRoutes');

const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend dashboard if present
app.use(express.static(path.join(__dirname, '../public')));

// Root & Health Check Endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'JWT User Authentication API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'JWT Authentication API',
    version: '1.0.0',
    documentation: {
      endpoints: [
        { method: 'POST', path: '/api/users/register', access: 'Public', description: 'Register a new user' },
        { method: 'POST', path: '/api/users/login', access: 'Public', description: 'Authenticate user & issue JWT' },
        { method: 'GET', path: '/api/users/verify', access: 'Protected (Bearer Token)', description: 'Validate JWT token' },
        { method: 'GET', path: '/api/users/profile', access: 'Protected (Bearer Token)', description: 'Get authenticated user profile' },
        { method: 'GET', path: '/api/health', access: 'Public', description: 'Health check probe' }
      ]
    }
  });
});

// Authentication Routes
app.use('/api/users', userRoutes);

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`
  });
});

// Global Centralized Error Handler
app.use((err, req, res, next) => {
  // Handle invalid JSON body syntax errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload format in request body.'
    });
  }

  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;
