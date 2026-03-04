import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { query } from '../database/connection.js';

const router = Router();

/**
 * Talent profile endpoints.
 * - GET /api/profile -> returns the authenticated user's profile fields
 * - PUT /api/profile -> updates editable profile fields
 */

const USER_SELECT = `id, email, first_name, last_name, company_name, organization_id, role, email_verified,
                     phone, location, linkedin_profile_url, photo_url, remote_interest, salary_expectations, skills, created_at, updated_at`;

const toUserResponse = (row: any) => ({
  id: row.id?.toString?.() ?? String(row.id),
  email: row.email,
  first_name: row.first_name ?? null,
  last_name: row.last_name ?? null,
  company_name: row.company_name ?? null,
  organization_id: row.organization_id ?? null,
  // Role comes from DB as int in this project; keep what auth.service returns elsewhere.
  // For profile responses, frontend only needs fields; leave role as-is.
  role: row.role,
  email_verified: !!row.email_verified,
  phone: row.phone ?? null,
  location: row.location ?? null,
  linkedin_profile_url: row.linkedin_profile_url ?? null,
  photo_url: row.photo_url ?? null,
  remote_interest: row.remote_interest ?? null,
  salary_expectations: row.salary_expectations ?? null,
  skills: Array.isArray(row.skills) ? row.skills : [],
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// GET /api/profile
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const result = await query(`SELECT ${USER_SELECT} FROM users WHERE id = $1`, [req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({ success: true, user: toUserResponse(result.rows[0]) });
  } catch (e) {
    console.error('GET /profile failed:', e);
    return res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
});

// PUT /api/profile
router.put('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const {
      first_name,
      last_name,
      phone,
      location,
      linkedin_profile_url,
      photo_url,
      remote_interest,
      salary_expectations,
      skills,
    } = req.body ?? {};

    const nextSkills =
      Array.isArray(skills) ? skills.map((s: any) => String(s).trim()).filter(Boolean) : null;

    const nextRemoteInterest =
      remote_interest === undefined || remote_interest === null
        ? null
        : remote_interest === true ||
            remote_interest === 'true' ||
            remote_interest === 'remote' ||
            remote_interest === 'remote_only'
          ? 'remote'
          : 'any';

    const updated = await query(
      `UPDATE users
       SET first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),

           -- Only update these fields if they were provided in the request body.
           -- This prevents "skills-only" updates from blanking other columns.
           phone = COALESCE($4, phone),
           location = COALESCE($5, location),
           linkedin_profile_url = COALESCE($6, linkedin_profile_url),
           photo_url = COALESCE($7, photo_url),
           remote_interest = COALESCE($8, remote_interest),
           salary_expectations = COALESCE($9, salary_expectations),

           skills = COALESCE($10, skills),
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${USER_SELECT}`,
      [
        req.user.id,
        first_name ?? null,
        last_name ?? null,
        phone === undefined ? null : phone,
        location === undefined ? null : location,
        linkedin_profile_url === undefined ? null : linkedin_profile_url,
        photo_url === undefined ? null : photo_url,
        nextRemoteInterest,
        salary_expectations === undefined ? null : salary_expectations,
        nextSkills,
      ]
    );

    return res.json({ success: true, user: toUserResponse(updated.rows[0]) });
  } catch (e) {
    console.error('PUT /profile failed:', e);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

export default router;
