/**
 * User Authentication Routes
 * Mounts endpoints for registration, login, token verification, and protected profile access.
 */

const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const verifyToken = require('../middleware/verifyToken');
const { validateRegister, validateLogin } = require('../middleware/validation');

// Public Routes
router.post('/register', validateRegister, userController.register);
router.post('/login', validateLogin, userController.login);

// Protected Routes (Token Verification Guard Required)
router.get('/verify', verifyToken, userController.verifyTokenStatus);
router.get('/profile', verifyToken, userController.getProfile);

module.exports = router;
