/**
 * User Authentication Controller
 * Handles user registration, authentication, token issuance, and profile retrieval.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

/**
 * Helper to generate signed JWT with explicit expiration
 * @param {Object} user - User record
 * @returns {string} Signed JWT
 */
const generateToken = (user) => {
  const secretKey = process.env.JWT_SECRET || 'super_secret_jwt_key_placement_tracker_2026_secure';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };

  return jwt.sign(payload, secretKey, { expiresIn });
};

/**
 * Register a new user
 * POST /api/users/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = userModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address is already registered.'
      });
    }

    // Generate salt and hash the raw password
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user to data store
    const newUser = userModel.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'student'
    });

    // Generate signed JWT token
    const token = generateToken(newUser);

    // Return response with sanitized user and token
    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: userModel.sanitize(newUser)
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during user registration.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Log in an existing user
 * POST /api/users/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Verify password against stored hash using bcrypt.compare
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Issue signed JWT token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: userModel.sanitize(user)
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during user authentication.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify token validity and return authenticated user identity
 * GET /api/users/verify
 */
const verifyTokenStatus = async (req, res) => {
  try {
    // req.user has already been populated by verifyToken middleware
    return res.status(200).json({
      success: true,
      message: 'Token is valid and active.',
      user: req.user
    });
  } catch (error) {
    console.error('Verify Token Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error verifying token.'
    });
  }
};

/**
 * Get profile of current authenticated user
 * GET /api/users/profile
 */
const getProfile = async (req, res) => {
  try {
    const user = userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully.',
      user: userModel.sanitize(user)
    });
  } catch (error) {
    console.error('Profile Retrieval Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving user profile.'
    });
  }
};

module.exports = {
  register,
  login,
  verifyTokenStatus,
  getProfile,
  generateToken
};
