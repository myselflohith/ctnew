import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as authService from './auth.service';
import * as db from '../database/connection';
import * as emailService from './email.service';

vi.mock('../database/connection');
vi.mock('./email.service');

const mockQuery = vi.mocked(db.query);
const mockSendPasswordResetEmail = vi.mocked(emailService.sendPasswordResetEmail);

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'talent' as const,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            email: 'newuser@example.com',
            first_name: 'John',
            last_name: 'Doe',
            company_name: null,
            role: 'talent',
            email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await authService.registerUser(registerData);

      expect(result.user.email).toBe('newuser@example.com');
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should throw error if user already exists', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        role: 'talent' as const,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'existing-user-id' }],
      } as any);

      await expect(authService.registerUser(registerData)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should hash password before storing', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'PlainPassword123',
        role: 'talent' as const,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            email: 'test@example.com',
            password_hash: 'hashed-password',
            role: 'talent',
            email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await authService.registerUser(registerData);

      const insertCall = mockQuery.mock.calls[1];
      const passwordHash = insertCall[1][1];
      
      expect(passwordHash).not.toBe('PlainPassword123');
      expect(await bcrypt.compare('PlainPassword123', passwordHash as string)).toBe(true);
    });

    it('should convert email to lowercase', async () => {
      const registerData = {
        email: 'Test@Example.COM',
        password: 'password123',
        role: 'talent' as const,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            email: 'test@example.com',
            role: 'talent',
            email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await authService.registerUser(registerData);

      expect(mockQuery.mock.calls[0][1][0]).toBe('test@example.com');
    });

    it('should auto-verify admin email', async () => {
      const registerData = {
        email: 'admin@cardinaltalent.com',
        password: 'AdminPass123!',
        role: 'talent' as const,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'admin-123',
            email: 'admin@cardinaltalent.com',
            role: 'admin',
            email_verified: true,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await authService.registerUser(registerData);

      expect(result.user.role).toBe('admin');
      expect(result.user.email_verified).toBe(true);
    });

    it('should create session after registration', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'talent' as const,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            email: 'test@example.com',
            role: 'talent',
            email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await authService.registerUser(registerData);

      const sessionCall = mockQuery.mock.calls[2];
      expect(sessionCall[0]).toContain('INSERT INTO sessions');
    });
  });

  describe('loginUser', () => {
    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            email: 'user@example.com',
            password_hash: hashedPassword,
            first_name: 'John',
            last_name: 'Doe',
            role: 'talent',
            email_verified: true,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await authService.loginUser(loginData);

      expect(result.user.email).toBe('user@example.com');
      expect(result.token).toBeDefined();
      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('should throw error for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await expect(authService.loginUser(loginData)).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw error for invalid password', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'wrongpassword',
      };

      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'user@example.com',
          password_hash: hashedPassword,
          role: 'talent',
          email_verified: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      } as any);

      await expect(authService.loginUser(loginData)).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should create session on successful login', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            email: 'user@example.com',
            password_hash: hashedPassword,
            role: 'talent',
            email_verified: true,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await authService.loginUser(loginData);

      const sessionCall = mockQuery.mock.calls[1];
      expect(sessionCall[0]).toContain('INSERT INTO sessions');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return user', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'talent' },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      );

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ token, expires_at: new Date(Date.now() + 86400000) }],
        } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'talent',
            email_verified: true,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        } as any);

      const user = await authService.verifyToken(token);

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid-token';

      const user = await authService.verifyToken(invalidToken);

      expect(user).toBeNull();
    });

    it('should return null for expired session', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'talent' },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      );

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const user = await authService.verifyToken(token);

      expect(user).toBeNull();
    });
  });

  describe('logoutUser', () => {
    it('should delete session on logout', async () => {
      const token = 'test-token';

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await authService.logoutUser(token);

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE token = $1',
        [token]
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate reset token and send email', async () => {
      const email = 'user@example.com';

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            email: 'user@example.com',
            first_name: 'John',
          }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await authService.requestPasswordReset(email);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        email,
        'John',
        expect.any(String)
      );
    });

    it('should not reveal if user does not exist', async () => {
      const email = 'nonexistent@example.com';

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await expect(authService.requestPasswordReset(email)).resolves.not.toThrow();
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const resetToken = 'valid-reset-token';
      const newPassword = 'NewSecurePass123!';

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'user-123' }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await authService.resetPassword(resetToken, newPassword);

      expect(mockQuery).toHaveBeenCalledTimes(3);
      
      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE users SET password_hash');
      
      const deleteSessionsCall = mockQuery.mock.calls[2];
      expect(deleteSessionsCall[0]).toContain('DELETE FROM sessions');
    });

    it('should throw error for invalid reset token', async () => {
      const resetToken = 'invalid-token';
      const newPassword = 'NewPassword123!';

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await expect(authService.resetPassword(resetToken, newPassword)).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });

    it('should invalidate all sessions after password reset', async () => {
      const resetToken = 'valid-reset-token';
      const newPassword = 'NewPassword123!';

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'user-123' }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await authService.resetPassword(resetToken, newPassword);

      const deleteSessionsCall = mockQuery.mock.calls[2];
      expect(deleteSessionsCall[0]).toContain('DELETE FROM sessions WHERE user_id');
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: userId,
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'talent',
          email_verified: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      } as any);

      const user = await authService.getUserById(userId);

      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
      expect(user?.email).toBe('user@example.com');
    });

    it('should return null for non-existent user', async () => {
      const userId = 'non-existent-id';

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const user = await authService.getUserById(userId);

      expect(user).toBeNull();
    });
  });
});
