/**
 * Automated Test Suite for JWT User Authentication
 * Covers registration, bcrypt hashing, login, token issuance, middleware verification,
 * expired tokens, and payload validations.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const userModel = require('../src/models/userModel');

describe('JWT User Authentication & Security Test Suite', () => {
  beforeEach(() => {
    // Clear in-memory user store before each test
    userModel.clear();
  });

  describe('POST /api/users/register', () => {
    it('should successfully register a new user and return a signed JWT token', async () => {
      const payload = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'securePassword123',
        role: 'student'
      };

      const res = await request(app)
        .post('/api/users/register')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('successfully');
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');

      // Verify user object is sanitized (no password exposed)
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe('Jane Doe');
      expect(res.body.user.email).toBe('jane@example.com');
      expect(res.body.user.password).toBeUndefined();

      // Verify password was securely hashed in store
      const storedUser = userModel.findByEmail('jane@example.com');
      expect(storedUser).toBeDefined();
      expect(storedUser.password).not.toBe(payload.password);
      expect(storedUser.password.startsWith('$2')).toBe(true);

      const isMatch = await bcrypt.compare(payload.password, storedUser.password);
      expect(isMatch).toBe(true);

      // Verify token decoded claims
      const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_placement_tracker_2026_secure';
      const decoded = jwt.verify(res.body.token, secret);
      expect(decoded.email).toBe('jane@example.com');
      expect(decoded.name).toBe('Jane Doe');
    });

    it('should reject registration if email is already registered', async () => {
      const payload = {
        name: 'Duplicate Test',
        email: 'duplicate@example.com',
        password: 'password123'
      };

      // First registration
      await request(app).post('/api/users/register').send(payload);

      // Second registration with same email
      const res = await request(app).post('/api/users/register').send(payload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already registered');
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Invalid Email',
          email: 'not-an-email',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' })
        ])
      );
    });

    it('should reject registration with password shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Short Pass',
          email: 'short@example.com',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' })
        ])
      );
    });

    it('should reject registration with missing name', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          email: 'noname@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      // Seed a user for login tests
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('CorrectPassword99', salt);
      userModel.create({
        name: 'Alex Hunter',
        email: 'alex@example.com',
        password: hashedPassword,
        role: 'student'
      });
    });

    it('should successfully log in with valid credentials and return a JWT', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'alex@example.com',
          password: 'CorrectPassword99'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('alex@example.com');
      expect(res.body.user.password).toBeUndefined();

      // Verify the generated token
      const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_placement_tracker_2026_secure';
      const decoded = jwt.verify(res.body.token, secret);
      expect(decoded.email).toBe('alex@example.com');
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'alex@example.com',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login for non-existent email', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'ghost@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'alex@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Protected Routes & Token Verification Middleware', () => {
    let validToken;
    let seededUser;

    beforeEach(async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('secretPass123', salt);
      seededUser = userModel.create({
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        password: hashedPassword,
        role: 'admin'
      });

      const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_placement_tracker_2026_secure';
      validToken = jwt.sign(
        { id: seededUser.id, email: seededUser.email, name: seededUser.name, role: seededUser.role },
        secret,
        { expiresIn: '1h' }
      );
    });

    it('should access protected profile with a valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('sarah@example.com');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should verify token status on GET /api/users/verify', async () => {
      const res = await request(app)
        .get('/api/users/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('valid');
      expect(res.body.user.email).toBe('sarah@example.com');
    });

    it('should deny access when Authorization header is missing (401)', async () => {
      const res = await request(app).get('/api/users/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('MissingToken');
    });

    it('should deny access when Authorization header does not use Bearer scheme (401)', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Basic ${validToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('MalformedHeader');
    });

    it('should deny access when token is invalid or tampered (403)', async () => {
      const tamperedToken = validToken.slice(0, -6) + 'abcdef';

      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('InvalidToken');
    });

    it('should gracefully reject expired tokens with 401 and TokenExpired error', async () => {
      const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_placement_tracker_2026_secure';
      // Create a token expired in the past (-10 seconds)
      const expiredToken = jwt.sign(
        { id: seededUser.id, email: seededUser.email },
        secret,
        { expiresIn: '-10s' }
      );

      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('TokenExpired');
      expect(res.body.message).toContain('expired');
    });
  });

  describe('General Endpoints', () => {
    it('should return health status on /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });

    it('should return 404 for non-existent API routes', async () => {
      const res = await request(app).get('/api/users/non-existent-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
