import request from 'supertest';
import {app} from '../server';
import User from '../models/User';
import jwt from 'jsonwebtoken';

describe('Authentication API Tests', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
    role: 'member'
  };

  beforeEach(async () => {
    // Clear users collection before each test
    await User.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('name', testUser.name);
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('role', testUser.role);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not register a user with existing email', async () => {
      // Create a user first
      await User.create(testUser);

      // Try to register with the same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'User already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          // Missing email and password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContainEqual(expect.objectContaining({
        field: 'email'
      }));
      expect(response.body.errors).toContainEqual(expect.objectContaining({
        field: 'password'
      }));
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          password: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContainEqual(expect.objectContaining({
        field: 'password'
      }));
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a user before each test
      await User.create(testUser);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      // Create a user and get token
      const user = await User.create(testUser);
      token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
      );
    });

    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', testUser.name);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let token: string;

    beforeEach(async () => {
      // Create a user and get token
      const user = await User.create(testUser);
      token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
      );
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });
  });
}); 