import { Router, Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  getUserById,
  getAllUsers,
  setEmployerCompany,
} from '../services/auth.service.js';
import {
  getOrganizationByEmailDomain,
  normalizeCompanyName,
  findOrganizationByNormalizedName,
} from '../services/organization.service.js';
import { sendCompanyApprovalRequestEmail } from '../services/email.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

// Import ROLE_ENUM for validation - investor=2, admin=3, talent=4, employer=5, recruiter=6
const ROLE_ENUM: { [key: string]: number } = {
  investor: 2,
  admin: 3,
  talent: 4,
  employer: 5,
  recruiter: 6,
};

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, companyName, organizationId, role, username, location, linkedinUrl } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (role === undefined || role === null || role === '') {
      res.status(400).json({ error: 'Role is required' });
      return;
    }

    // Validate role - accept both string and integer formats
    let validRole = false;
    if (typeof role === 'string') {
      validRole = ['investor', 'talent', 'employer', 'recruiter', 'admin'].includes(role.toLowerCase());
    } else if (typeof role === 'number') {
      validRole = Object.values(ROLE_ENUM).includes(role);
    }

    if (!validRole) {
      res.status(400).json({ error: 'Invalid role. Must be: investor (2), talent (4), employer (5), recruiter (6), or admin (3)' });
      return;
    }

    const { user, token } = await registerUser({
      email,
      password,
      firstName,
      lastName,
      companyName,
      organizationId: organizationId || null,
      role,
      username: username ?? null,
      location: location ?? null,
      linkedinUrl: linkedinUrl ?? null,
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

/**
 * Public: check if a user exists by email.
 * Used by interview invite flow to decide whether to redirect to login or signup.
 * GET /api/auth/exists?email=someone@example.com
 */
router.get('/exists', async (req: Request, res: Response) => {
  try {
    const email = (req.query.email || '').toString().toLowerCase().trim();
    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    const { query } = await import('../database/connection.js');
    const result = await query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [email]);

    res.json({ success: true, exists: result.rows.length > 0 });
  } catch (error: any) {
    console.error('User exists check error:', error);
    res.status(500).json({ error: error.message || 'Failed to check user' });
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

// Get all users (admin only)
router.get('/all', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const users = await getAllUsers();
    res.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: error.message || 'Failed to get users' });
  }
});

// --- Employer onboarding: set company (no dropdown; only approved orgs) ---

// Get suggested organization by current user's email domain (website_url match)
router.get('/employer/suggested-org', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const email = req.user.email;
    if (!email) {
      res.json({ success: true, data: null });
      return;
    }
    const org = await getOrganizationByEmailDomain(email);
    if (!org) {
      res.json({ success: true, data: null });
      return;
    }
    res.json({ success: true, data: { id: org.id, name: org.name } });
  } catch (error: any) {
    console.error('Suggested org error:', error);
    res.status(500).json({ error: error.message || 'Failed to get suggested organization' });
  }
});

// Validate company name: normalize (trim, collapse spaces), case-insensitive match. Returns org if found.
router.post('/employer/validate-company', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { companyName } = req.body;
    if (!companyName || typeof companyName !== 'string') {
      res.status(400).json({ error: 'Company name is required' });
      return;
    }
    const normalized = normalizeCompanyName(companyName);
    if (!normalized) {
      res.json({ success: true, found: false });
      return;
    }
    const org = await findOrganizationByNormalizedName(normalized);
    if (!org) {
      res.json({ success: true, found: false });
      return;
    }
    res.json({ success: true, found: true, organization: { id: org.id, name: org.name } });
  } catch (error: any) {
    console.error('Validate company error:', error);
    res.status(500).json({ error: error.message || 'Failed to validate company' });
  }
});

// Set employer's company (after validation). Requires organizationId from validate-company.
router.post('/employer/set-company', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { organizationId, companyName } = req.body;
    if (!organizationId || !companyName) {
      res.status(400).json({ error: 'organizationId and companyName are required' });
      return;
    }
    const user = await setEmployerCompany(req.user.id, organizationId, companyName);
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Set employer company error:', error);
    res.status(400).json({ error: error.message || 'Failed to set company' });
  }
});

// Request company approval: send email to internal team via AWS SES (company not in approved list).
router.post('/employer/request-company-approval', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { displayName, userEmail, companyName } = req.body;
    if (!companyName || typeof companyName !== 'string') {
      res.status(400).json({ error: 'Company name is required' });
      return;
    }
    await sendCompanyApprovalRequestEmail(
      displayName || 'User',
      userEmail || req.user.email || '',
      companyName.trim()
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error('Request company approval email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send approval request' });
  }
});

export default router;
