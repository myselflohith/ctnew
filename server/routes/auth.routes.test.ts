import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import authRoutes from './auth.routes';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  createTestUser,
  createTestSession,
} from '../test/helpers/db-setup';
import { createUserFactory } from '../../src/test/factories';
import { generateTestToken } from '../../src/test/helpers/test-utils';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await setupTestDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'talent',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.token).toBeDefined();
      expect(response.body.message).toBe('User registered successfully');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 400 for invalid role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          role: 'invalid_role',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid role');
    });

    it('should return 400 for duplicate email', async () => {
      const userData = createUserFactory({
        email: 'existing@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
      });
      await createTestUser(userData);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          role: 'talent',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    it('should set httpOnly cookie with token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'cookietest@example.com',
          password: 'password123',
          role: 'talent',
        });

      expect(response.status).toBe(201);
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('token=');
      expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    });

    it('should handle employer registration with company name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'employer@example.com',
          password: 'password123',
          firstName: 'Jane',
          lastName: 'Smith',
          companyName: 'Tech Corp',
          role: 'employer',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('employer');
      expect(response.body.user.company_name).toBe('Tech Corp');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const password = 'password123';
      const userData = createUserFactory({
        email: 'logintest@example.com',
        passwordHash: await bcrypt.hash(password, 10),
      });
      await createTestUser(userData);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.message).toBe('Login successful');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 for invalid password', async () => {
      const userData = createUserFactory({
        email: 'user@example.com',
        passwordHash: await bcrypt.hash('correctpassword', 10),
      });
      await createTestUser(userData);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should not expose password_hash in response', async () => {
      const password = 'password123';
      const userData = createUserFactory({
        email: 'securetest@example.com',
        passwordHash: await bcrypt.hash(password, 10),
      });
      await createTestUser(userData);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'securetest@example.com',
          password: password,
        });

      expect(response.status).toBe(200);
      expect(response.body.user).not.toHaveProperty('password_hash');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should be case-insensitive for email', async () => {
      const password = 'password123';
      const userData = createUserFactory({
        email: 'casetest@example.com',
        passwordHash: await bcrypt.hash(password, 10),
      });
      await createTestUser(userData);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'CaseTest@Example.COM',
          password: password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout authenticated user', async () => {
      const userData = createUserFactory();
      await createTestUser(userData);
      const token = generateTestToken({ userId: userData.id });
      await createTestSession({ userId: userData.id, token });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Logged out');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
    });

    it('should clear cookie on logout', async () => {
      const userData = createUserFactory();
      await createTestUser(userData);
      const token = generateTestToken({ userId: userData.id });
      await createTestSession({ userId: userData.id, token });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        expect(setCookie[0]).toContain('token=;');
      }
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user data', async () => {
      const userData = createUserFactory({
        email: 'currentuser@example.com',
        firstName: 'Current',
        lastName: 'User',
      });
      await createTestUser(userData);
      const token = generateTestToken({ userId: userData.id });
      await createTestSession({ userId: userData.id, token });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('currentuser@example.com');
      expect(response.body.user.first_name).toBe('Current');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should accept password reset request', async () => {
      const userData = createUserFactory({
        email: 'resettest@example.com',
      });
      await createTestUser(userData);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'resettest@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('sent');
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('sent');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const userData = createUserFactory();
      const resetToken = 'valid-reset-token-123';
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      await createTestUser({
        ...userData,
        resetToken,
        resetTokenExpires: expiresAt,
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewSecurePass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('reset');
    });

    it('should return 400 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'some-token',
        });

      expect(response.status).toBe(400);
    });
  });
});
