import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireRole } from './auth.middleware';
import * as authService from '../services/auth.service';

vi.mock('../services/auth.service');

const mockVerifyToken = vi.mocked(authService.verifyToken);

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate with valid token in Authorization header', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'talent' as const,
        first_name: 'Test',
        last_name: 'User',
        company_name: null,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token',
      };

      mockVerifyToken.mockResolvedValueOnce(mockUser);

      await authenticateToken(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should authenticate with valid token in cookie', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'talent' as const,
        first_name: 'Test',
        last_name: 'User',
        company_name: null,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockReq.cookies = {
        token: 'cookie-token',
      };

      mockVerifyToken.mockResolvedValueOnce(mockUser);

      await authenticateToken(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockVerifyToken).toHaveBeenCalledWith('cookie-token');
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when no token provided', async () => {
      await authenticateToken(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockVerifyToken.mockResolvedValueOnce(null);

      await authenticateToken(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token verification throws error', async () => {
      mockReq.headers = {
        authorization: 'Bearer error-token',
      };

      mockVerifyToken.mockRejectedValueOnce(new Error('Verification failed'));

      await authenticateToken(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should prefer Authorization header over cookie', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'talent' as const,
        first_name: 'Test',
        last_name: 'User',
        company_name: null,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockReq.headers = {
        authorization: 'Bearer header-token',
      };
      mockReq.cookies = {
        token: 'cookie-token',
      };

      mockVerifyToken.mockResolvedValueOnce(mockUser);

      await authenticateToken(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockVerifyToken).toHaveBeenCalledWith('header-token');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'talent',
        first_name: 'Test',
        last_name: 'User',
        company_name: null,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
    });

    it('should allow access for user with correct role', () => {
      const middleware = requireRole('talent');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow access for user with one of multiple allowed roles', () => {
      const middleware = requireRole(['talent', 'employer']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 403 for user without required role', () => {
      const middleware = requireRole('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      mockReq.user = undefined;
      const middleware = requireRole('talent');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle single role as string', () => {
      mockReq.user!.role = 'employer';
      const middleware = requireRole('employer');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle multiple roles as array', () => {
      mockReq.user!.role = 'recruiter';
      const middleware = requireRole(['employer', 'recruiter', 'admin']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
