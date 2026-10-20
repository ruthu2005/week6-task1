/**
 * Token Verification Middleware
 * Inspects Authorization Bearer headers, validates JWT signature and expiration,
 * and attaches decoded user identity to req.user for downstream handlers.
 */

const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers['authorization'];

  // Check if Authorization header is present
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.',
      error: 'MissingToken'
    });
  }

  // Ensure header strictly conforms to "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization format. Format must be "Bearer <token>".',
      error: 'MalformedHeader'
    });
  }

  const token = parts[1];

  if (!token || token.trim() === '') {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Token is empty.',
      error: 'EmptyToken'
    });
  }

  const secretKey = process.env.JWT_SECRET || 'super_secret_jwt_key_placement_tracker_2026_secure';

  // Verify token signature and expiration
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication token has expired. Please log in again.',
          error: 'TokenExpired',
          expiredAt: err.expiredAt
        });
      }

      return res.status(403).json({
        success: false,
        message: 'Invalid or malformed authentication token.',
        error: 'InvalidToken'
      });
    }

    // Optionally check if user exists in store (or use decoded token)
    const user = userModel.findById(decoded.id);
    if (!user && process.env.NODE_ENV !== 'test') {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
        error: 'UserNotFound'
      });
    }

    // Attach user identity to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || (user ? user.role : 'student'),
      name: decoded.name || (user ? user.name : 'Unknown')
    };

    next();
  });
};

module.exports = verifyToken;
