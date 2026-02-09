import { Router, Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  getUserById,
} from '../services/auth.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, companyName, role } = req.body;

    // Validate required fields
    if (!email || !password || !role) {
      res.status(400).json({ error: 'Email, password, and role are required' });
      return;
    }

    // Validate role
    if (!['talent', 'employer', 'recruiter'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const { user, token } = await registerUser({
      email,
      password,
      firstName,
      lastName,
      companyName,
      role,
    });

    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      user,
      token,
      message: 'User registered successfully',
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const { user, token } = await loginUser({ email, password });

    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      user,
      token,
      message: 'Login successful',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Logout user
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1] || req.cookies?.token;

    if (token) {
      await logoutUser(token);
    }

    res.clearCookie('token');
    res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    res.json({ success: true, user: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Request password reset
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    await requestPasswordReset(email);

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: 'Token and password are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long' });
      return;
    }

    await resetPassword(token, password);

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error: any) {
    console.error('Password reset error:', error);
    res.status(400).json({ error: error.message || 'Password reset failed' });
  }
});

export default router;
