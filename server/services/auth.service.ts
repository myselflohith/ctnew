import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection.js';
import { sendPasswordResetEmail } from './email.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
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
  role: 'talent' | 'employer' | 'recruiter';
}

export interface LoginData {
  email: string;
  password: string;
}

// Register a new user
export async function registerUser(data: RegisterData): Promise<{ user: User; token: string }> {
  const { email, password, firstName, lastName, companyName, role } = data;

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
  const userRole = isAdmin ? 'admin' : role;

  // Insert user
  const result = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, company_name, role, verification_token, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, email, first_name, last_name, company_name, role, email_verified, created_at, updated_at`,
    [
      email.toLowerCase(),
      passwordHash,
      firstName || null,
      lastName || null,
      companyName || null,
      userRole,
      verificationToken,
      isAdmin, // Auto-verify admin
    ]
  );

  const user = result.rows[0];

  // Generate JWT token
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  });

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await query(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, token, expiresAt]
  );

  return { user, token };
}

// Login user
export async function loginUser(data: LoginData): Promise<{ user: User; token: string }> {
  const { email, password } = data;

  // Find user
  const result = await query(
    `SELECT id, email, password_hash, first_name, last_name, company_name, role, email_verified, created_at, updated_at
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = result.rows[0];

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Remove password_hash from user object
  delete user.password_hash;

  // Generate JWT token
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  });

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await query(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, token, expiresAt]
  );

  return { user, token };
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
      `SELECT id, email, first_name, last_name, company_name, role, email_verified, created_at, updated_at
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    return userResult.rows[0];
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
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
    [passwordHash, userId]
  );

  // Invalidate all existing sessions
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  const result = await query(
    `SELECT id, email, first_name, last_name, company_name, role, email_verified, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}
