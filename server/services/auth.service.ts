import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection.js';
import { sendPasswordResetEmail } from './email.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// Role enum mapping - matches ch-job-marketplace
// Only supporting: admin=3, talent=4, employer=5
const ROLE_ENUM: { [key: string]: number } = {
  admin: 3,
  talent: 4,
  employer: 5,
};

// Reverse mapping
const ROLE_ID_TO_STRING: { [key: number]: string } = {
  3: 'admin',
  4: 'talent',
  5: 'employer',
};

function getRoleId(roleString: string): number {
  const normalizedRole = roleString.toLowerCase().trim();
  const roleId = ROLE_ENUM[normalizedRole];
  if (roleId === undefined) {
    throw new Error(`Invalid role: "${roleString}". Valid roles are: ${Object.keys(ROLE_ENUM).join(', ')}`);
  }
  return roleId;
}

function getRoleString(roleId: number): string {
  const roleString = ROLE_ID_TO_STRING[roleId];
  if (!roleString) {
    throw new Error(`Invalid role ID: ${roleId}`);
  }
  return roleString;
}

// Helper function to format user object for API response
function formatUserResponse(userRow: any): User {
  return {
    id: userRow.id.toString(),
    email: userRow.email,
    first_name: userRow.first_name,
    last_name: userRow.last_name,
    company_name: userRow.company_name,
    organization_id: userRow.organization_id ?? null,
    role: getRoleString(userRow.role) as any,
    email_verified: userRow.email_verified,
    created_at: userRow.created_at,
    updated_at: userRow.updated_at,
  };
}

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  organization_id: string | null;
  role: 'talent' | 'employer' | 'recruiter' | 'admin';
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  organizationId?: string | null;
  role: string | number;
}

export interface LoginData {
  email: string;
  password: string;
}

// Register a new user
export async function registerUser(data: RegisterData): Promise<{ user: User; token: string }> {
  const { email, password, firstName, lastName, companyName, organizationId, role } = data;

  // Validate email
  if (!email || typeof email !== 'string') {
    throw new Error('Valid email is required');
  }

  // Validate password
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Check if user already exists
  const existingUser = await query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingUser.rows.length > 0) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Generate verification token
  const verificationToken = uuidv4();

  // Check if email is admin email
  const isAdmin = email.toLowerCase() === 'admin@cardinaltalent.com';
  
  let roleId: number;
  try {
    if (isAdmin) {
      roleId = ROLE_ENUM['admin'];
    } else if (typeof role === 'number') {
      if (ROLE_ID_TO_STRING[role] === undefined) {
        throw new Error(`Invalid role ID: ${role}. Valid IDs are: 0-14`);
      }
      roleId = role;
    } else if (typeof role === 'string') {
      roleId = getRoleId(role);
    } else {
      throw new Error('Role must be a string or number');
    }
  } catch (error: any) {
    throw new Error(`Role validation failed: ${error.message}`);
  }
  
  const userRole = getRoleString(roleId);

  // Insert user (include organization_id when selecting existing org)
  const orgIdParam = organizationId && /^[0-9a-f-]{36}$/i.test(organizationId) ? organizationId : null;
  const result = await query(
    `INSERT INTO users (email, encrypted_password, first_name, last_name, company_name, organization_id, role, verification_token, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, email, first_name, last_name, company_name, organization_id, role, email_verified, created_at, updated_at`,
    [
      email.toLowerCase(),
      passwordHash,
      firstName || null,
      lastName || null,
      companyName || null,
      orgIdParam,
      roleId,
      verificationToken,
      isAdmin, // Auto-verify admin
    ]
  );

  const user = result.rows[0];
  const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : Number(user.id);

  // If employer and no organization_id yet: create new organization and link user (owner_id = user id)
  const shouldCreateOrg = userRole === 'employer' && !orgIdParam && companyName != null && String(companyName).trim() !== '';
  const orgNameToUse = companyName != null ? String(companyName).trim() : '';

  if (shouldCreateOrg && orgNameToUse) {
    try {
      const orgResult = await query(
        `INSERT INTO organizations (name, owner_id, status, created_at, updated_at)
         VALUES ($1, $2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [orgNameToUse, userId]
      );
      const newOrgId = orgResult.rows[0]?.id;
      if (newOrgId) {
        await query(
          'UPDATE users SET organization_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newOrgId, userId]
        );
        user.organization_id = newOrgId;
      }
    } catch (error: any) {
      if (error?.code === '23505') {
        // Unique violation: org name already exists; find existing org and link user
        const existing = await query(
          'SELECT id FROM organizations WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND discarded_at IS NULL LIMIT 1',
          [orgNameToUse]
        );
        if (existing.rows[0]?.id) {
          await query(
            'UPDATE users SET organization_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [existing.rows[0].id, userId]
          );
          user.organization_id = existing.rows[0].id;
        }
      } else {
        console.error('Error creating organization:', error);
        throw new Error('Failed to create organization. Please try again.');
      }
    }
  }

  const formattedUser = formatUserResponse(user);
  const token = jwt.sign({ userId: user.id, email: user.email, role: formattedUser.role }, JWT_SECRET, {
    expiresIn: '7d',
  });

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await query(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, token, expiresAt]
  );

  return { user: formattedUser, token };
}

// Login user
export async function loginUser(data: LoginData): Promise<{ user: User; token: string }> {
  const { email, password } = data;

  // Find user
  const result = await query(
    `SELECT id, email, encrypted_password, first_name, last_name, company_name, organization_id, role, email_verified, created_at, updated_at
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = result.rows[0];

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.encrypted_password);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Remove encrypted_password from user object
  delete user.encrypted_password;

  const formattedUser = formatUserResponse(user);

  // Generate JWT token
  const token = jwt.sign({ userId: user.id, email: user.email, role: formattedUser.role }, JWT_SECRET, {
    expiresIn: '7d',
  });

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await query(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, token, expiresAt]
  );

  return { user: formattedUser, token };
}

// Verify JWT token
export async function verifyToken(token: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Check if session exists and is not expired
    const sessionResult = await query(
      'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return null;
    }

    // Get user
    const userResult = await query(
      `SELECT id, email, first_name, last_name, company_name, organization_id, role, email_verified, created_at, updated_at
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    return formatUserResponse(userResult.rows[0]);
  } catch (error) {
    return null;
  }
}

// Logout user
export async function logoutUser(token: string): Promise<void> {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
}

// Request password reset
export async function requestPasswordReset(email: string): Promise<void> {
  const result = await query(
    'SELECT id, email, first_name FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    // Don't reveal if user exists
    return;
  }

  const user = result.rows[0];

  // Generate reset token
  const resetToken = uuidv4();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

  await query(
    'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
    [resetToken, expiresAt, user.id]
  );

  // Send password reset email
  await sendPasswordResetEmail(user.email, user.first_name || 'User', resetToken);
}

// Reset password
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const result = await query(
    'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
    [token]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired reset token');
  }

  const userId = result.rows[0].id;

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password and clear reset token
  await query(
    'UPDATE users SET encrypted_password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
    [passwordHash, userId]
  );

  // Invalidate all existing sessions
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  const result = await query(
    `SELECT id, email, first_name, last_name, company_name, organization_id, role, email_verified, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId]
  );

  return result.rows.length > 0 ? formatUserResponse(result.rows[0]) : null;
}

// Set employer's company (organization_id and company_name). Employer only; id must be valid org.
export async function setEmployerCompany(userId: string, organizationId: string, companyName: string): Promise<User> {
  await query(
    'UPDATE users SET organization_id = $1, company_name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
    [organizationId, companyName, userId]
  );
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');
  return user;
}

// Get all users (admin only)
export async function getAllUsers(): Promise<any[]> {
  const result = await query(
    `SELECT 
       u.id,
       u.email,
       u.first_name,
       u.last_name,
       u.company_name,
       u.role,
       u.email_verified,
       u.created_at,
       u.updated_at,
       MAX(s.created_at) as last_active
     FROM users u
     LEFT JOIN sessions s ON s.user_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC`
  );
  return result.rows.map(row => ({
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    company_name: row.company_name,
    role: row.role,
    email_verified: row.email_verified,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_active: row.last_active,
  }));
}
